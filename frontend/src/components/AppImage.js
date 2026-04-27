import React, { forwardRef, memo } from "react";

/**
 * WebP-friendly img: pass `src` (often already .webp from the API). Optional `webpSrc`
 * renders a &lt;picture&gt; when both URLs are known.
 */
const AppImage = memo(
  forwardRef(function AppImage(
    {
      src,
      webpSrc,
      alt = "",
      loading,
      fetchPriority,
      decoding = "async",
      sizes,
      className,
      style,
      onClick,
      ...rest
    },
    ref,
  ) {
    const load = loading ?? "lazy";
    const mergedStyle = { display: "block", ...style };
    const common = {
      alt,
      decoding,
      sizes,
      className,
      style: mergedStyle,
      onClick,
      ...rest,
    };

    if (webpSrc && webpSrc !== src) {
      return (
        <picture
          style={{
            display: "block",
            width: "100%",
            height: "100%",
          }}
        >
          <source type="image/webp" srcSet={webpSrc} sizes={sizes} />
          <img
            ref={ref}
            src={src}
            loading={load}
            fetchPriority={fetchPriority}
            {...common}
          />
        </picture>
      );
    }

    return (
      <img
        ref={ref}
        src={src}
        loading={load}
        fetchPriority={fetchPriority}
        {...common}
      />
    );
  }),
);

AppImage.displayName = "AppImage";

export default AppImage;
