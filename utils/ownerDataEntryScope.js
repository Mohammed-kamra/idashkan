const mongoose = require("mongoose");
const Store = require("../models/Store");
const Brand = require("../models/Brand");
const Company = require("../models/Company");
const Product = require("../models/Product");
const { isOwnerDataEntryRole } = require("./roleHelpers");

function hasOwnerDataEntryScope(user) {
  if (!user || !isOwnerDataEntryRole(user)) return false;
  if (
    user.ownerDataEntryAllStores ||
    user.ownerDataEntryAllBrands ||
    user.ownerDataEntryAllCompanies
  ) {
    return true;
  }
  const ns = user.ownerDataEntryStoreIds?.length || 0;
  const nb = user.ownerDataEntryBrandIds?.length || 0;
  const nc = user.ownerDataEntryCompanyIds?.length || 0;
  return ns + nb + nc > 0;
}

/**
 * Mongo filter: products visible to this owner_dataentry user (by linked entities).
 */
async function buildOwnerDataEntryProductFilter(user) {
  if (!hasOwnerDataEntryScope(user)) {
    return { _id: { $in: [] } };
  }

  const or = [];

  if (user.ownerDataEntryAllStores) {
    or.push({ storeId: { $ne: null } });
  } else if (user.ownerDataEntryStoreIds?.length) {
    or.push({ storeId: { $in: user.ownerDataEntryStoreIds } });
  }

  if (user.ownerDataEntryAllBrands) {
    or.push({ brandId: { $ne: null } });
  } else if (user.ownerDataEntryBrandIds?.length) {
    or.push({ brandId: { $in: user.ownerDataEntryBrandIds } });
  }

  if (user.ownerDataEntryAllCompanies) {
    or.push({ companyId: { $ne: null } });
  } else if (user.ownerDataEntryCompanyIds?.length) {
    or.push({ companyId: { $in: user.ownerDataEntryCompanyIds } });
  }

  if (or.length === 0) return { _id: { $in: [] } };
  return { $or: or };
}

function truthyId(id) {
  return (
    id != null &&
    String(id).trim() !== "" &&
    String(id).trim() !== "null" &&
    mongoose.Types.ObjectId.isValid(String(id))
  );
}

/**
 * Validates exactly one of storeId / brandId / companyId and that it is allowed for this user.
 */
async function assertOwnerDataEntryCanCreateProduct(user, { storeId, brandId, companyId }) {
  const hasStore = truthyId(storeId);
  const hasBrand = truthyId(brandId);
  const hasCompany = truthyId(companyId);
  const n = [hasStore, hasBrand, hasCompany].filter(Boolean).length;
  if (n !== 1) {
    return {
      ok: false,
      message: "Exactly one of storeId, brandId, or companyId is required",
    };
  }

  if (hasStore) {
    if (!user.ownerDataEntryAllStores) {
      const allowed = (user.ownerDataEntryStoreIds || []).map((x) => String(x));
      if (!allowed.includes(String(storeId))) {
        return { ok: false, message: "You cannot add products for this store" };
      }
    }
    const s = await Store.findById(storeId).select("_id").lean();
    if (!s) return { ok: false, message: "Store not found" };
    return { ok: true };
  }

  if (hasBrand) {
    if (!user.ownerDataEntryAllBrands) {
      const allowed = (user.ownerDataEntryBrandIds || []).map((x) => String(x));
      if (!allowed.includes(String(brandId))) {
        return { ok: false, message: "You cannot add products for this brand" };
      }
    }
    const b = await Brand.findById(brandId).select("_id").lean();
    if (!b) return { ok: false, message: "Brand not found" };
    return { ok: true };
  }

  if (hasCompany) {
    if (!user.ownerDataEntryAllCompanies) {
      const allowed = (user.ownerDataEntryCompanyIds || []).map((x) => String(x));
      if (!allowed.includes(String(companyId))) {
        return { ok: false, message: "You cannot add products for this company" };
      }
    }
    const c = await Company.findById(companyId).select("_id").lean();
    if (!c) return { ok: false, message: "Company not found" };
    return { ok: true };
  }

  return { ok: false, message: "Invalid product owner" };
}

/**
 * True if this product is visible under owner data entry scope rules.
 */
async function productMatchesOwnerDataEntryScope(user, productId) {
  if (!user || !hasOwnerDataEntryScope(user)) return false;
  if (!truthyId(productId)) return false;
  const scope = await buildOwnerDataEntryProductFilter(user);
  const id = new mongoose.Types.ObjectId(String(productId));
  return !!(await Product.exists({ $and: [{ _id: id }, scope] }));
}

/** Single owner key for scoped product (store wins over brand over company). */
function primaryOwnerIdsFromProduct(product) {
  const p = product || {};
  if (truthyId(p.storeId)) {
    return { storeId: p.storeId, brandId: null, companyId: null };
  }
  if (truthyId(p.brandId)) {
    return { storeId: null, brandId: p.brandId, companyId: null };
  }
  if (truthyId(p.companyId)) {
    return { storeId: null, brandId: null, companyId: p.companyId };
  }
  return { storeId: null, brandId: null, companyId: null };
}

function normalizeOwnerDataEntryPayload(body) {
  const {
    ownerDataEntryAllStores,
    ownerDataEntryAllBrands,
    ownerDataEntryAllCompanies,
    ownerDataEntryStoreIds,
    ownerDataEntryBrandIds,
    ownerDataEntryCompanyIds,
  } = body || {};

  const toOidArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => (x && x._id ? x._id : x))
      .filter((id) => truthyId(id))
      .map((id) => new mongoose.Types.ObjectId(String(id)));
  };

  return {
    ownerDataEntryAllStores: !!ownerDataEntryAllStores,
    ownerDataEntryAllBrands: !!ownerDataEntryAllBrands,
    ownerDataEntryAllCompanies: !!ownerDataEntryAllCompanies,
    ownerDataEntryStoreIds: toOidArray(ownerDataEntryStoreIds),
    ownerDataEntryBrandIds: toOidArray(ownerDataEntryBrandIds),
    ownerDataEntryCompanyIds: toOidArray(ownerDataEntryCompanyIds),
  };
}

function validateOwnerDataEntryScopePayload(payload) {
  const anyAll =
    payload.ownerDataEntryAllStores ||
    payload.ownerDataEntryAllBrands ||
    payload.ownerDataEntryAllCompanies;
  const anyIds =
    payload.ownerDataEntryStoreIds.length +
      payload.ownerDataEntryBrandIds.length +
      payload.ownerDataEntryCompanyIds.length >
    0;
  if (!anyAll && !anyIds) {
    return {
      ok: false,
      message:
        "Owner Data Entry role requires at least one of: All stores/brands/companies, or specific store/brand/company ids",
    };
  }
  return { ok: true };
}

module.exports = {
  hasOwnerDataEntryScope,
  buildOwnerDataEntryProductFilter,
  assertOwnerDataEntryCanCreateProduct,
  productMatchesOwnerDataEntryScope,
  primaryOwnerIdsFromProduct,
  normalizeOwnerDataEntryPayload,
  validateOwnerDataEntryScopePayload,
  truthyId,
};
