const mongoose = require("mongoose");
const Store = require("../models/Store");

/**
 * Resolve a branch row to a peer store. Prefer storeId when present (avoids duplicate-name bugs).
 */
async function resolvePeer(row) {
  if (!row || typeof row !== "object") return null;
  if (row.storeId) {
    try {
      const peer = await Store.findById(row.storeId).select("_id name").lean();
      if (peer?.name) return peer;
    } catch {
      return null;
    }
  }
  if (row.name && typeof row.name === "string") {
    const trimmed = row.name.trim();
    if (!trimmed) return null;
    return Store.findOne({ name: trimmed }).select("_id name").lean();
  }
  return null;
}

/**
 * When store S picks branches, all stores in the new cluster list each other (full clique).
 * Peers S removed ("dropped") lose branch links to S's new cluster members.
 * Uses a transaction when the deployment supports it; otherwise applies updates sequentially.
 */
async function syncBranchCluster(storeId, newBranchRows, oldStoreSnapshot) {
  const sid = String(storeId);

  const uniqObjectIds = (ids) => {
    const seen = new Set();
    const out = [];
    for (const id of ids) {
      const s = String(id);
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(new mongoose.Types.ObjectId(s));
    }
    return out;
  };

  const newPeerIds = [];
  for (const row of newBranchRows || []) {
    const peer = await resolvePeer(row);
    if (peer && String(peer._id) !== sid) newPeerIds.push(peer._id);
  }
  const newClusterIds = uniqObjectIds([sid, ...newPeerIds]);

  const oldPeerIds = [];
  for (const row of oldStoreSnapshot?.branches || []) {
    const peer = await resolvePeer(row);
    if (peer && String(peer._id) !== sid) oldPeerIds.push(peer._id);
  }

  const newPeerIdSet = new Set(newPeerIds.map(String));
  const droppedPeerIds = oldPeerIds.filter(
    (id) => !newPeerIdSet.has(String(id)),
  );

  const newClusterStores = await Store.find({
    _id: { $in: newClusterIds },
  })
    .select("name")
    .lean();

  if (newClusterStores.length !== newClusterIds.length) {
    const found = new Set(newClusterStores.map((s) => String(s._id)));
    const missing = newClusterIds.filter((id) => !found.has(String(id)));
    console.warn(
      "[syncBranchCluster] Some cluster store ids were not found:",
      missing.map(String),
    );
  }

  const nameById = new Map(
    newClusterStores.map((s) => [String(s._id), s.name]),
  );
  const newClusterNameSet = new Set(
    newClusterStores.map((s) => s.name).filter(Boolean),
  );
  const newClusterIdStrSet = new Set(newClusterIds.map(String));

  const applyUpdates = async (session) => {
    const opts = session ? { session } : {};

    for (const id of newClusterIds) {
      const others = newClusterIds.filter((oid) => String(oid) !== String(id));
      const branches = others
        .map((oid) => {
          const n = nameById.get(String(oid));
          return n
            ? { name: n, storeId: new mongoose.Types.ObjectId(String(oid)) }
            : null;
        })
        .filter(Boolean);
      await Store.updateOne({ _id: id }, { $set: { branches } }, opts);
    }

    for (const pid of droppedPeerIds) {
      let q = Store.findById(pid).select("branches");
      if (session) q = q.session(session);
      const P = await q.lean();
      if (!P) continue;
      const filtered = (P.branches || []).filter((b) => {
        if (b?.storeId && newClusterIdStrSet.has(String(b.storeId))) {
          return false;
        }
        if (b?.name && newClusterNameSet.has(b.name)) {
          return false;
        }
        return true;
      });
      await Store.updateOne({ _id: pid }, { $set: { branches: filtered } }, opts);
    }
  };

  const session = await Store.startSession();
  try {
    await session.withTransaction(async () => {
      await applyUpdates(session);
    });
  } catch (err) {
    const msg = String(err?.message || "");
    const noTxn =
      msg.includes("Transaction numbers") ||
      msg.includes("replica set") ||
      msg.includes("mongos") ||
      err?.code === 20 ||
      err?.codeName === "IllegalOperation";
    if (noTxn) {
      console.warn(
        "[syncBranchCluster] Transactions unavailable; applying branch sync without transaction:",
        msg,
      );
      await applyUpdates(null);
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }
}

module.exports = { syncBranchCluster };
