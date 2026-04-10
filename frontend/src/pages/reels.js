import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Skeleton,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { videoAPI } from "../services/api";
import useIntersectionVideo from "../hooks/useIntersectionVideo";
import { useUserTracking } from "../hooks/useUserTracking";
import useIsMobileLayout from "../hooks/useIsMobileLayout";
import { useCityFilter } from "../context/CityFilterContext";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { isExpiryStillValid } from "../utils/expiryDate";
import { useLocalizedContent } from "../hooks/useLocalizedContent";
import { useContentRefresh } from "../context/ContentRefreshContext";
import useCachedData from "../hooks/useCachedData";
import useOnlineStatus from "../hooks/useOnlineStatus";
import OfflineCacheChip from "../components/OfflineCacheChip";

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

const ReelCard = memo(function ReelCard({
  reel,
  index,
  isActive,
  shouldLoad,
  registerSectionRef,
  registerVideoRef,
  onLike,
  onShare,
  isMobile,
  isPaused,
  onTogglePlayback,
  progress,
  buffered,
  onSeek,
  isLiked,
  likeLoading,
  canFollowOwner,
  isOwnerFollowed,
  ownerFollowLoading,
  onToggleOwnerFollow,
}) {
  const { locName, locTitle, locDescription } = useLocalizedContent();
  const src = resolveMediaUrl(reel.videoUrl || "");
  const owner = reel.brandId?._id
    ? { ...reel.brandId, type: "brand" }
    : reel.storeId?._id
      ? { ...reel.storeId, type: "store" }
      : null;
  const ownerName = owner ? locName(owner) : "";
  const ownerProfilePath = owner
    ? owner.type === "brand"
      ? `/brands/${owner._id}`
      : `/stores/${owner._id}`
    : "";
  const ownerLogo = owner?.logo ? resolveMediaUrl(owner.logo) : "";

  const actionBottom = isMobile
    ? "calc(96px + env(safe-area-inset-bottom))"
    : 32;
  const textBottom = isMobile
    ? "calc(120px + env(safe-area-inset-bottom))"
    : 72;
  const progressBottom = isMobile
    ? "calc(72px + env(safe-area-inset-bottom))"
    : 10;
  const progressRef = useRef(null);
  const isDraggingSeekRef = useRef(false);
  const [isLandscapeVideo, setIsLandscapeVideo] = useState(false);

  useEffect(() => {
    const stopDragging = () => {
      isDraggingSeekRef.current = false;
    };
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, []);

  const getSeekPercent = (clientX) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(
      100,
      Math.max(0, ((clientX - rect.left) / rect.width) * 100),
    );
  };

  return (
    <Box
      ref={(node) => registerSectionRef(index, node)}
      data-reel-index={index}
      sx={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        backgroundColor: "#000",
      }}
    >
      {shouldLoad ? (
        <video
          ref={(node) => registerVideoRef(index, node)}
          src={src}
          autoPlay={isActive && !isPaused}
          loop
          muted={false}
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const { videoWidth, videoHeight } = e.currentTarget;
            setIsLandscapeVideo(videoWidth > videoHeight);
          }}
          onLoadedData={(e) => {
            if (isActive && !isPaused) {
              e.currentTarget.play().catch(() => {});
            } else {
              e.currentTarget.pause();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: isLandscapeVideo ? "contain" : "cover",
            objectPosition: "center center",
            transform: "translateZ(0)",
          }}
        />
      ) : (
        <Box
          sx={{ width: "100%", height: "100%", backgroundColor: "#101010" }}
        />
      )}

      {!isActive && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <PlayArrowIcon
            sx={{ color: "rgba(255,255,255,0.8)", fontSize: 56 }}
          />
        </Box>
      )}

      {isActive && (
        <Box
          onClick={onTogglePlayback}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            cursor: "pointer",
          }}
        />
      )}

      <MotionBox
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: isActive ? 1 : 0.82, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        sx={{
          position: "absolute",
          left: 16,
          right: 86,
          bottom: textBottom,
          zIndex: 4,
          color: "#fff",
          textShadow: "0 2px 10px rgba(0,0,0,0.55)",
        }}
      >
        {!!ownerName && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
            <Typography
              variant="body2"
              component={Link}
              to={ownerProfilePath}
              onClick={(e) => e.stopPropagation()}
              sx={{
                opacity: 0.95,
                fontSize: 18,
                fontWeight: 900,
                color: "#fff",
                textDecoration: "none",
                display: "inline-flex",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {ownerName}
            </Typography>
            {canFollowOwner && (
              <Button
                size="small"
                variant={isOwnerFollowed ? "contained" : "outlined"}
                disabled={ownerFollowLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleOwnerFollow();
                }}
                sx={{
                  minWidth: 86,
                  px: 1,
                  py: 0.15,
                  borderRadius: 99,
                  fontSize: 12,
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.8)",
                  backgroundColor: isOwnerFollowed
                    ? "rgba(255,122,26,0.85)"
                    : "rgba(0,0,0,0.25)",
                }}
              >
                {isOwnerFollowed ? "Following" : "Follow"}
              </Button>
            )}
          </Box>
        )}
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 2000, fontSize: 15, lineHeight: 1.25 }}
        >
          {locTitle(reel) || "Untitled Reel"}
        </Typography>
        {!!locDescription(reel) && (
          <Typography
            variant="body2"
            sx={{ mt: 0.75, opacity: 0.92, fontSize: 16, fontWeight: 700 }}
          >
            {locDescription(reel)}
          </Typography>
        )}
      </MotionBox>

      <MotionBox
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        sx={{
          position: "absolute",
          right: 12,
          bottom: actionBottom,
          zIndex: 7,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.4,
        }}
      >
        {owner && (
          <Box sx={{ textAlign: "center" }}>
            <MotionIconButton
              component={Link}
              to={ownerProfilePath}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: "#fff",
                p: 0.25,
                border: "2px solid rgba(255,255,255,0.85)",
                backgroundColor: "rgba(0,0,0,0.35)",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
              }}
            >
              {ownerLogo ? (
                <Box
                  component="img"
                  src={ownerLogo}
                  alt={ownerName || "owner"}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    backgroundColor: "rgba(255,255,255,0.16)",
                  }}
                >
                  {(ownerName || "?").slice(0, 1).toUpperCase()}
                </Box>
              )}
            </MotionIconButton>
          </Box>
        )}

        <Box sx={{ textAlign: "center" }}>
          <MotionIconButton
            whileTap={{ scale: 1.25 }}
            transition={{ type: "spring", stiffness: 340, damping: 18 }}
            onClick={(e) => {
              e.stopPropagation();
              onLike(reel._id);
            }}
            disabled={likeLoading}
            sx={{
              color: isLiked ? "#ff4d67" : "#fff",
              backgroundColor: "rgba(0,0,0,0.35)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
            }}
          >
            <FavoriteIcon />
          </MotionIconButton>
          <Typography
            variant="caption"
            sx={{ color: "#fff", display: "block", mt: 0.5 }}
          >
            {reel.like ?? 0}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <IconButton
            disableRipple
            sx={{
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.35)",
              cursor: "default",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.35)" },
            }}
          >
            <VisibilityIcon />
          </IconButton>
          <Typography
            variant="caption"
            sx={{ color: "#fff", display: "block", mt: 0.5 }}
          >
            {reel.views ?? 0}
          </Typography>
        </Box>
        {/* <Box sx={{ textAlign: "center" }}>
          <MotionIconButton
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onShare(reel);
            }}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.35)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
            }}
          >
            <ShareIcon />
          </MotionIconButton>
          <Typography
            variant="caption"
            sx={{ color: "#fff", display: "block", mt: 0.5 }}
          >
            {reel.shares ?? 0}
          </Typography>
        </Box> */}
      </MotionBox>

      {isActive && isPaused && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <PauseIcon sx={{ color: "rgba(255,255,255,0.9)", fontSize: 64 }} />
        </Box>
      )}

      <Box
        ref={progressRef}
        onPointerDown={(e) => {
          if (!isActive) return;
          e.stopPropagation();
          isDraggingSeekRef.current = true;
          onSeek(getSeekPercent(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!isActive) return;
          if (!isDraggingSeekRef.current) return;
          e.stopPropagation();
          onSeek(getSeekPercent(e.clientX));
        }}
        onPointerUp={(e) => {
          if (!isActive) return;
          e.stopPropagation();
          isDraggingSeekRef.current = false;
        }}
        onPointerCancel={() => {
          isDraggingSeekRef.current = false;
        }}
        sx={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: progressBottom,
          height: 5,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.18)",
          zIndex: 8,
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <Box
          sx={{
            width: `${Math.max(0, Math.min(buffered, 100))}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: "rgba(200,200,200,0.65)",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
        <Box
          sx={{
            width: `${Math.max(0, Math.min(progress, 100))}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(255,122,26,0.95), rgba(255,255,255,0.95))",
            transition: "width 120ms linear",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
      </Box>
    </Box>
  );
});

const ReelsPage = () => {
  const { videoId: sharedVideoId } = useParams();
  const [mainPageTab, setMainPageTab] = useState(0); // 0 = For You, 1 = Following
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [progressById, setProgressById] = useState({});
  const [bufferedById, setBufferedById] = useState({});
  const [likeLoadingById, setLikeLoadingById] = useState({});
  const [followLoadingByStore, setFollowLoadingByStore] = useState({});
  const [followedStoreIds, setFollowedStoreIds] = useState([]);
  const [followLoadingTab, setFollowLoadingTab] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const viewedIdsRef = useRef(new Set());
  const pullStartYRef = useRef(null);
  const pullTriggeredRef = useRef(false);
  const randomOrderKeyRef = useRef({});
  const isPausedRef = useRef(isPaused);
  const resumePlaybackAfterVisibleRef = useRef(false);
  /** True while we treat the app as backgrounded — blocks observer/activeIndex from forcing play. */
  const reelsAppSuspendedRef = useRef(false);
  const isMobile = useIsMobileLayout();
  const observerThreshold = useMemo(() => [0.45, 0.65, 0.9], []);
  const {
    toggleVideoLike,
    isVideoLiked,
    toggleFollowStore,
    isStoreFollowed,
    getFollowedStores,
  } = useUserTracking();
  const { selectedCity } = useCityFilter();
  const { triggerRefresh } = useContentRefresh();
  const isOnline = useOnlineStatus();
  const { items: cachedReels } = useCachedData("videos");
  const showCacheChip = !isOnline && reels.length > 0;

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const handleReelsNavTap = (event) => {
      const isDoubleTap = Boolean(event?.detail?.doubleTap);
      const isAtTop = (containerRef.current?.scrollTop || 0) <= 8;

      if (isDoubleTap || isAtTop) {
        triggerRefresh?.();
      } else if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("app:reels-nav-tap", handleReelsNavTap);
    return () =>
      window.removeEventListener("app:reels-nav-tap", handleReelsNavTap);
  }, [triggerRefresh]);

  const handleTabSwitch = useCallback((tabIndex) => {
    if (tabIndex === 1) {
      setFollowLoadingTab(true);
    }
    setMainPageTab(tabIndex);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const getRandomOrderKey = useCallback((id) => {
    if (!id) return Number.MAX_SAFE_INTEGER;
    if (randomOrderKeyRef.current[id] === undefined) {
      randomOrderKeyRef.current[id] = Math.random();
    }
    return randomOrderKeyRef.current[id];
  }, []);

  const displayedReels = useMemo(() => {
    const normalizeCity = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const cityCanonicalMap = {
      erbil: "erbil",
      hawler: "erbil",
      hewler: "erbil",
      sulaimani: "sulaimani",
      sulaymaniyah: "sulaimani",
      sulaimany: "sulaimani",
      duhok: "duhok",
      dahuk: "duhok",
      kerkuk: "kerkuk",
      kirkuk: "kerkuk",
      halabja: "halabja",
      helebce: "halabja",
    };
    const toCanonicalCity = (value) => {
      const normalized = normalizeCity(value);
      return cityCanonicalMap[normalized] || normalized;
    };
    const selectedCityCanonical = toCanonicalCity(selectedCity);

    const unexpiredAndCityMatched = reels.filter((reel) => {
      if (reel?.expireDate && !isExpiryStillValid(reel.expireDate))
        return false;

      if (!selectedCityCanonical) return true;

      const hasBrandOwner = Boolean(reel?.brandId?._id || reel?.brandId);
      if (hasBrandOwner) return true;

      const storeCity = reel?.storeId?.storecity || reel?.storeId?.city || "";
      const brandCity =
        reel?.brandId?.brandcity ||
        reel?.brandId?.city ||
        reel?.brandId?.storecity ||
        "";
      const ownerCityCanonical = toCanonicalCity(storeCity || brandCity);
      return ownerCityCanonical && ownerCityCanonical === selectedCityCanonical;
    });

    const baseList =
      mainPageTab !== 1
        ? unexpiredAndCityMatched
        : unexpiredAndCityMatched.filter((reel) => {
            const storeId = reel?.storeId?._id || reel?.storeId;
            return storeId && followedStoreIds.includes(String(storeId));
          });

    const randomized = [...baseList].sort(
      (a, b) =>
        getRandomOrderKey(String(a?._id)) - getRandomOrderKey(String(b?._id)),
    );

    // Interleave: after every 10 store reels, show 1 brand reel (if available)
    const storeReels = [];
    const brandReels = [];
    randomized.forEach((reel) => {
      const hasBrandOwner = Boolean(reel?.brandId?._id || reel?.brandId);
      if (hasBrandOwner) brandReels.push(reel);
      else storeReels.push(reel);
    });

    const interleaved = [];
    let s = 0;
    let b = 0;
    while (s < storeReels.length || b < brandReels.length) {
      for (let i = 0; i < 10 && s < storeReels.length; i += 1) {
        interleaved.push(storeReels[s++]);
      }
      if (b < brandReels.length) {
        interleaved.push(brandReels[b++]);
      }
      // If there are no store reels left, drain remaining brand reels.
      if (s >= storeReels.length && b < brandReels.length) {
        while (b < brandReels.length) interleaved.push(brandReels[b++]);
      }
      // If there are no brand reels left, drain remaining store reels.
      if (b >= brandReels.length && s < storeReels.length) {
        while (s < storeReels.length) interleaved.push(storeReels[s++]);
      }
    }

    if (!sharedVideoId) return interleaved;

    const sharedIndex = interleaved.findIndex(
      (reel) => String(reel?._id) === String(sharedVideoId),
    );
    if (sharedIndex <= 0) return interleaved;

    const sharedReel = interleaved[sharedIndex];
    const rest = interleaved.filter((_, idx) => idx !== sharedIndex);
    return [sharedReel, ...rest];
  }, [
    mainPageTab,
    reels,
    followedStoreIds,
    getRandomOrderKey,
    sharedVideoId,
    selectedCity,
  ]);

  useEffect(() => {
    if (sharedVideoId) {
      // Shared link should always open in For You and show that reel first.
      setMainPageTab(0);
    }
  }, [sharedVideoId]);

  const { activeIndex, registerSectionRef, registerVideoRef, videoRefs } =
    useIntersectionVideo({
      rootRef: containerRef,
      itemCount: displayedReels.length,
      threshold: observerThreshold,
    });

  useEffect(() => {
    // Resume playback for newly active reel by default.
    setIsPaused(false);
  }, [activeIndex]);

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      video.muted = false;
      if (idx === activeIndex) {
        if (isPaused) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
      }
    });
  }, [activeIndex, isPaused, videoRefs]);

  useEffect(() => {
    // Hard guard: keep non-active videos paused at all times.
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      if (idx !== activeIndex) {
        video.pause();
      }
    });
  }, [activeIndex, reels.length, videoRefs]);

  useEffect(() => {
    const pauseAllForBackground = () => {
      reelsAppSuspendedRef.current = true;
      videoRefs.current.forEach((video) => {
        if (video) {
          try {
            video.pause();
          } catch (_) {
            /* ignore */
          }
        }
      });
      if (!isPausedRef.current) {
        resumePlaybackAfterVisibleRef.current = true;
      }
      setIsPaused(true);
    };

    const tryResumeAfterForeground = () => {
      if (!resumePlaybackAfterVisibleRef.current) return;
      resumePlaybackAfterVisibleRef.current = false;
      setIsPaused(false);
    };

    const onReturnToForeground = () => {
      requestAnimationFrame(() => {
        if (document.visibilityState === "hidden") return;
        reelsAppSuspendedRef.current = false;
        tryResumeAfterForeground();
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden || document.visibilityState !== "visible") {
        pauseAllForBackground();
      } else {
        onReturnToForeground();
      }
    };

    const onPageHide = () => pauseAllForBackground();
    const onPageShow = () => onReturnToForeground();

    const onWindowBlur = () => pauseAllForBackground();
    const onWindowFocus = () => onReturnToForeground();

    const onFreeze = () => pauseAllForBackground();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("freeze", onFreeze);

    // Android WebView often skips visibilitychange; native host can call this from Activity.onPause.
    if (typeof window !== "undefined") {
      window.patrisPauseReels = pauseAllForBackground;
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("freeze", onFreeze);
      if (typeof window !== "undefined" && window.patrisPauseReels) {
        delete window.patrisPauseReels;
      }
    };
  }, []);

  useEffect(() => {
    const onPlayCapture = (e) => {
      const v = e.target;
      if (!v || v.tagName !== "VIDEO") return;
      if (containerRef.current && !containerRef.current.contains(v)) return;
      if (reelsAppSuspendedRef.current || document.hidden) {
        v.pause();
      }
    };
    document.addEventListener("play", onPlayCapture, true);
    return () => document.removeEventListener("play", onPlayCapture, true);
  }, []);

  useEffect(() => {
    let frameId;
    let lastUiUpdateAt = 0;
    let lastProgress = -1;
    let lastBuffered = -1;

    const updateProgress = () => {
      const activeVideo = videoRefs.current[activeIndex];
      const activeReel = displayedReels[activeIndex];
      if (activeVideo && activeReel?._id) {
        const duration = Number(activeVideo.duration) || 0;
        const current = Number(activeVideo.currentTime) || 0;
        const bufferedEnd =
          duration > 0 &&
          activeVideo.buffered &&
          activeVideo.buffered.length > 0
            ? Number(
                activeVideo.buffered.end(activeVideo.buffered.length - 1),
              ) || 0
            : 0;
        const percent =
          duration > 0
            ? Math.min(100, Math.max(0, (current / duration) * 100))
            : 0;
        const bufferedPercent =
          duration > 0
            ? Math.min(100, Math.max(0, (bufferedEnd / duration) * 100))
            : 0;
        const now = performance.now();
        const shouldUpdateUi =
          now - lastUiUpdateAt >= 120 ||
          Math.abs(percent - lastProgress) >= 1 ||
          Math.abs(bufferedPercent - lastBuffered) >= 1;

        if (shouldUpdateUi) {
          lastUiUpdateAt = now;
          lastProgress = percent;
          lastBuffered = bufferedPercent;

          setProgressById((prev) => {
            if (prev[activeReel._id] === percent) return prev;
            return { ...prev, [activeReel._id]: percent };
          });
          setBufferedById((prev) => {
            if (prev[activeReel._id] === bufferedPercent) return prev;
            return { ...prev, [activeReel._id]: bufferedPercent };
          });
        }
      }
      frameId = window.requestAnimationFrame(updateProgress);
    };

    frameId = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeIndex, displayedReels, videoRefs]);

  const togglePlayback = useCallback(() => {
    const activeVideo = videoRefs.current[activeIndex];
    if (!activeVideo) return;

    if (activeVideo.paused) {
      activeVideo.play().catch(() => {});
      setIsPaused(false);
    } else {
      activeVideo.pause();
      setIsPaused(true);
    }
  }, [activeIndex, videoRefs]);

  const seekActiveVideo = useCallback(
    (percent) => {
      const activeVideo = videoRefs.current[activeIndex];
      const activeReel = displayedReels[activeIndex];
      if (!activeVideo || !activeReel?._id) return;

      const duration = Number(activeVideo.duration) || 0;
      if (duration <= 0) return;

      const safePercent = Math.min(100, Math.max(0, percent));
      activeVideo.currentTime = (safePercent / 100) * duration;
      setProgressById((prev) => ({ ...prev, [activeReel._id]: safePercent }));
    },
    [activeIndex, displayedReels, videoRefs],
  );

  const fetchReels = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const response = await videoAPI.getAll();
      setReels(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch reels:", err);
      setError("Failed to load reels.");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchReels(false);
  }, [fetchReels]);

  useEffect(() => {
    if (isOnline) return;
    if (!reels.length && cachedReels.length) {
      setReels(cachedReels);
      setLoading(false);
      setError("");
    }
  }, [isOnline, reels.length, cachedReels]);

  // Pull-to-refresh on the reels scroll container.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const onTouchStart = (e) => {
      if (container.scrollTop <= 0) {
        pullStartYRef.current = e.touches[0].clientY;
        pullTriggeredRef.current = false;
      } else {
        pullStartYRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (pullStartYRef.current == null || pullTriggeredRef.current) return;
      if (container.scrollTop > 0) return;
      const diff = e.touches[0].clientY - pullStartYRef.current;
      if (diff > 70 && !refreshing) {
        pullTriggeredRef.current = true;
        fetchReels(true);
      }
    };

    const onTouchEnd = () => {
      pullStartYRef.current = null;
      pullTriggeredRef.current = false;
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [fetchReels, refreshing]);

  useEffect(() => {
    const activeReel = displayedReels[activeIndex];
    if (!activeReel?._id || viewedIdsRef.current.has(activeReel._id)) return;

    viewedIdsRef.current.add(activeReel._id);
    videoAPI
      .incrementView(activeReel._id)
      .then((res) => {
        const updated = res?.data;
        setReels((prev) =>
          prev.map((item) =>
            item._id === activeReel._id
              ? {
                  ...item,
                  views: updated?.views ?? item.views,
                  like: updated?.like ?? item.like,
                  shares: updated?.shares ?? item.shares,
                }
              : item,
          ),
        );
      })
      .catch(() => {});
  }, [activeIndex, displayedReels]);

  const handleLike = useCallback(
    async (id) => {
      if (likeLoadingById[id]) return;

      const currentlyLiked = isVideoLiked(id);
      setLikeLoadingById((prev) => ({ ...prev, [id]: true }));
      setReels((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                like: Math.max(0, (item.like || 0) + (currentlyLiked ? -1 : 1)),
              }
            : item,
        ),
      );

      try {
        const result = await toggleVideoLike(id);
        if (!result?.success) {
          setReels((prev) =>
            prev.map((item) =>
              item._id === id
                ? {
                    ...item,
                    like: Math.max(
                      0,
                      (item.like || 0) + (currentlyLiked ? 1 : -1),
                    ),
                  }
                : item,
            ),
          );
        } else {
          const serverLikeCount = result?.data?.likeCount;
          if (typeof serverLikeCount === "number") {
            setReels((prev) =>
              prev.map((item) =>
                item._id === id
                  ? { ...item, like: Math.max(0, serverLikeCount) }
                  : item,
              ),
            );
          }
        }
      } catch (error) {
        setReels((prev) =>
          prev.map((item) =>
            item._id === id
              ? {
                  ...item,
                  like: Math.max(
                    0,
                    (item.like || 0) + (currentlyLiked ? 1 : -1),
                  ),
                }
              : item,
          ),
        );
      } finally {
        setLikeLoadingById((prev) => ({ ...prev, [id]: false }));
      }
    },
    [isVideoLiked, likeLoadingById, toggleVideoLike],
  );
  useEffect(() => {
    if (mainPageTab !== 1) return;
    const loadFollowedStores = async () => {
      try {
        setFollowLoadingTab(true);
        const result = await getFollowedStores();
        const ids = (
          result?.success && Array.isArray(result.data) ? result.data : []
        ).map((store) => String(store._id));
        setFollowedStoreIds(ids);
      } catch (err) {
        setFollowedStoreIds([]);
      } finally {
        setFollowLoadingTab(false);
      }
    };
    loadFollowedStores();
  }, [mainPageTab, getFollowedStores]);

  useEffect(() => {
    if (mainPageTab !== 1 || followLoadingTab || loading) return undefined;
    if (displayedReels.length > 0) return undefined;

    const id = window.setTimeout(() => {
      setMainPageTab(0);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 3000);

    return () => window.clearTimeout(id);
  }, [mainPageTab, followLoadingTab, loading, displayedReels.length]);

  const handleOwnerFollowToggle = useCallback(
    async (storeId) => {
      if (!storeId || followLoadingByStore[storeId]) return;
      setFollowLoadingByStore((prev) => ({ ...prev, [storeId]: true }));
      try {
        const result = await toggleFollowStore(storeId);
        if (result?.success) {
          const nowFollowed = !!result?.data?.isFollowed;
          setFollowedStoreIds((prev) =>
            nowFollowed
              ? Array.from(new Set([...prev, String(storeId)]))
              : prev.filter((id) => id !== String(storeId)),
          );
        }
      } finally {
        setFollowLoadingByStore((prev) => ({ ...prev, [storeId]: false }));
      }
    },
    [followLoadingByStore, toggleFollowStore],
  );

  // Keep only active + next video loaded for stable mobile performance.
  const preloadFlags = useMemo(
    () =>
      displayedReels.map(
        (_, index) => index === activeIndex || index === activeIndex + 1,
      ),
    [displayedReels, activeIndex],
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
          backgroundColor: "#000",
        }}
      >
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{
            width: "100%",
            maxWidth: 360,
            height: 32,
            borderRadius: 16,
            mx: "auto",
          }}
        />
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{
            width: "100%",
            maxWidth: 420,
            height: "60vh",
            borderRadius: 2,
            mx: "auto",
          }}
        />
        <Skeleton
          variant="text"
          animation="wave"
          sx={{ width: "60%", maxWidth: 320, mx: "auto" }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (reels.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography>No reels available yet.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ position: "relative", height: "100dvh", backgroundColor: "#000" }}
    >
      <Box
        sx={{
          position: "absolute",
          top: isMobile
            ? "calc(72px + env(safe-area-inset-top))"
            : "calc(82px + env(safe-area-inset-top))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "inline-flex",
          p: 0.4,
          borderRadius: 99,
          backgroundColor: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.25)",
          gap: 0.5,
        }}
      >
        <Button
          size="small"
          variant={mainPageTab === 0 ? "contained" : "text"}
          onClick={() => handleTabSwitch(0)}
          sx={{ borderRadius: 99, color: "#fff", minWidth: 96 }}
        >
          For You
        </Button>
        <Button
          size="small"
          variant={mainPageTab === 1 ? "contained" : "text"}
          onClick={() => handleTabSwitch(1)}
          sx={{ borderRadius: 99, color: "#fff", minWidth: 96 }}
        >
          Following
        </Button>
      </Box>
      {showCacheChip && (
        <Box
          sx={{
            position: "absolute",
            top: isMobile
              ? "calc(122px + env(safe-area-inset-top))"
              : "calc(130px + env(safe-area-inset-top))",
            right: 12,
            zIndex: 20,
          }}
        >
          <OfflineCacheChip />
        </Box>
      )}

      <Box
        ref={containerRef}
        sx={{
          height: "100dvh",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          touchAction: "pan-y",
          backgroundColor: "#000",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {refreshing && (
          <Box
            sx={{
              position: "absolute",
              top: isMobile ? 56 : 70,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 22,
              bgcolor: "rgba(0,0,0,0.45)",
              borderRadius: 99,
              px: 1.2,
              py: 0.6,
            }}
          >
            <CircularProgress size={18} />
          </Box>
        )}

        {mainPageTab === 1 && followLoadingTab && (
          <Box
            sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
          >
            <CircularProgress />
          </Box>
        )}

        {mainPageTab === 1 &&
          !followLoadingTab &&
          displayedReels.length === 0 && (
            <Box
              sx={{
                minHeight: "100dvh",
                display: "grid",
                placeItems: "center",
                px: 3,
              }}
            >
              <Typography sx={{ color: "#fff", textAlign: "center" }}>
                No reels from followed stores yet.
              </Typography>
            </Box>
          )}

        {(mainPageTab === 0 ||
          (mainPageTab === 1 && displayedReels.length > 0)) &&
          displayedReels.map((reel, index) => {
            const ownerStoreId = reel?.storeId?._id || reel?.storeId || "";
            const canFollowOwner = Boolean(ownerStoreId);
            return (
              <ReelCard
                key={reel._id || index}
                reel={reel}
                index={index}
                isActive={index === activeIndex}
                shouldLoad={preloadFlags[index]}
                registerSectionRef={registerSectionRef}
                registerVideoRef={registerVideoRef}
                onLike={handleLike}
                // onShare={handleShare}
                isMobile={isMobile}
                isPaused={isPaused}
                onTogglePlayback={togglePlayback}
                progress={progressById[reel._id] || 0}
                buffered={bufferedById[reel._id] || 0}
                onSeek={seekActiveVideo}
                isLiked={isVideoLiked(reel._id)}
                likeLoading={!!likeLoadingById[reel._id]}
                canFollowOwner={canFollowOwner}
                isOwnerFollowed={
                  canFollowOwner ? isStoreFollowed(String(ownerStoreId)) : false
                }
                ownerFollowLoading={
                  !!followLoadingByStore[String(ownerStoreId)]
                }
                onToggleOwnerFollow={() =>
                  handleOwnerFollowToggle(String(ownerStoreId))
                }
              />
            );
          })}
      </Box>
    </Box>
  );
};

export default ReelsPage;


