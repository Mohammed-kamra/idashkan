import { useCallback, useEffect, useState } from "react";
import { giftAPI, jobAPI, productAPI, storeAPI, videoAPI } from "../services/api";
import { isExpiryStillValid } from "../utils/expiryDate";

export default function useStoreProfile(storeId) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [reels, setReels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [giftsLoaded, setGiftsLoaded] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  useEffect(() => {
    // Reset lazy tab datasets/flags when navigating between stores.
    setGifts([]);
    setReels([]);
    setJobs([]);
    setGiftsLoaded(false);
    setReelsLoaded(false);
    setJobsLoaded(false);
  }, [storeId]);

  const loadInitial = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      setError("");
      const [storeResponse, productsResponse] = await Promise.all([
        storeAPI.getById(storeId),
        productAPI.getByStore(storeId),
      ]);
      setStore(storeResponse.data);
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          "Network error. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const loadGifts = useCallback(async () => {
    if (!storeId || giftsLoaded) return;
    try {
      const giftsResponse = await giftAPI.getByStore(storeId);
      setGifts(giftsResponse.data?.data || []);
    } catch {
      setGifts([]);
    } finally {
      setGiftsLoaded(true);
    }
  }, [storeId, giftsLoaded]);

  const loadReels = useCallback(async () => {
    if (!storeId || reelsLoaded) return;
    try {
      // Prefer backend filter; gracefully fallback to client filter.
      const videosRes = await videoAPI.getAll({ storeId });
      const list = Array.isArray(videosRes?.data) ? videosRes.data : [];
      const filtered = list.filter((v) => {
        const ownerStoreId = v?.storeId?._id || v?.storeId || "";
        if (String(ownerStoreId) !== String(storeId)) return false;
        if (!v?.expireDate) return true;
        return isExpiryStillValid(v.expireDate);
      });
      setReels(filtered);
    } catch {
      setReels([]);
    } finally {
      setReelsLoaded(true);
    }
  }, [storeId, reelsLoaded]);

  const loadJobs = useCallback(async () => {
    if (!storeId || jobsLoaded) return;
    try {
      const jobsRes = await jobAPI.getAll({ storeId });
      const list = Array.isArray(jobsRes?.data) ? jobsRes.data : [];
      const filtered = list.filter((j) => {
        const ownerStoreId = j?.storeId?._id || j?.storeId || "";
        if (String(ownerStoreId) !== String(storeId)) return false;
        if (j?.active === false) return false;
        if (!j?.expireDate) return true;
        return isExpiryStillValid(j.expireDate);
      });
      setJobs(filtered);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoaded(true);
    }
  }, [storeId, jobsLoaded]);

  const refreshAll = useCallback(async () => {
    await loadInitial();
    setGiftsLoaded(false);
    setReelsLoaded(false);
    setJobsLoaded(false);
  }, [loadInitial]);

  return {
    store,
    setStore,
    products,
    setProducts,
    gifts,
    setGifts,
    reels,
    setReels,
    jobs,
    setJobs,
    loading,
    error,
    setError,
    loadInitial,
    loadGifts,
    loadReels,
    loadJobs,
    refreshAll,
    giftsLoaded,
    reelsLoaded,
    jobsLoaded,
  };
}

