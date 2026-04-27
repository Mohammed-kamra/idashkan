import { useCallback, useState } from "react";

export default function useStoreFollow({ toggleFollowStore }) {
  const [followLoading, setFollowLoading] = useState(false);

  const handleToggleFollow = useCallback(
    async (storeId, currentFollowerCount, setFollowerCount) => {
      if (!storeId || !toggleFollowStore) return;
      setFollowLoading(true);
      try {
        const result = await toggleFollowStore(storeId);
        if (result?.success && result?.data != null && setFollowerCount) {
          setFollowerCount(
            Math.max(0, result.data.followerCount ?? currentFollowerCount),
          );
        }
      } finally {
        setFollowLoading(false);
      }
    },
    [toggleFollowStore],
  );

  return { followLoading, handleToggleFollow };
}

