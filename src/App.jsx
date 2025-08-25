import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";

// Optimized constants
const BUCKETS = ["tops", "bottoms", "outerwear", "footwear"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Utility functions
const cn = (...classes) => classes.filter(Boolean).join(" ");
const humanize = (str) => str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const createBlobURL = (file) => URL.createObjectURL(file);

// Memoized UI Components
const Button = React.memo(({ className = "", disabled, children, ...props }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-2xl px-4 py-2 font-medium shadow-sm transition hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
));

const Card = React.memo(({ className = "", children }) => (
  <div className={cn("rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm", className)}>
    {children}
  </div>
));

const Tag = React.memo(({ children }) => (
  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
    {children}
  </span>
));

const SectionTitle = React.memo(({ children }) => (
  <h2 className="mb-2 text-lg font-semibold text-zinc-900">{children}</h2>
));

// Optimized file validation
const validateFile = (file) => {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`);
  }
  return true;
};

// Optimized DropZone component
const DropZone = React.memo(({ label, multiple = false, onFiles, hint, disabled }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files) => {
    try {
      const validFiles = Array.from(files).filter(f => {
        try {
          validateFile(f);
          return true;
        } catch (e) {
          console.warn(`Skipping invalid file ${f.name}: ${e.message}`);
          return false;
        }
      });
      
      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    } catch (error) {
      console.error('File handling error:', error);
    }
  }, [onFiles]);

  const onPick = useCallback((e) => {
    handleFiles(e.target.files || []);
    e.target.value = ""; // Reset input
  }, [handleFiles]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files || []);
    }
  }, [handleFiles, disabled]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
        disabled 
          ? "border-zinc-200 bg-zinc-50 cursor-not-allowed opacity-60"
          : isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
      )}
    >
      <div className="text-sm font-medium text-zinc-800">{label}</div>
      <div className="text-xs text-zinc-500">
        {hint || (multiple ? "Drag & drop or click to add images" : "Drag & drop or click to choose an image")}
      </div>
      <input
        type="file"
        ref={inputRef}
        accept={SUPPORTED_TYPES.join(",")}
        multiple={multiple}
        onChange={onPick}
        disabled={disabled}
        hidden
      />
    </div>
  );
});

// Optimized image preview component
const ImagePreview = React.memo(({ file, onRemove, className = "" }) => {
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    if (file) {
      const url = createBlobURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <div className={cn("relative", className)}>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={file?.name || "Preview"} 
          className="h-full w-full rounded-lg object-cover"
          loading="lazy"
        />
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove"
          className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-xs font-medium shadow hover:bg-white transition"
        >
          ×
        </button>
      )}
    </div>
  );
});

// Main optimized application
export default function App() {
  const [tab, setTab] = useState("catalog");
  const defaultApi =
    (typeof window !== "undefined" &&
    window.location &&
    (window.location.port === "8000" || window.location.hostname === "127.0.0.1"))
      ? `${window.location.protocol}//${window.location.host}`
      : "http://127.0.0.1:8000";
  const [apiBase, setApiBase] = useState(defaultApi);

  useEffect(() => {
  let cancelled = false;
  fetch(`${apiBase}/health`)
    .then(r => r.json())
    .then(j => {
      if (cancelled) return;
      if (!j.engine_loaded) {
        setError(j.error ? `Backend not ready: ${j.error}` : "Backend not ready. Start the API on port 8000.");
      } else {
        setError("");
      }
    })
    .catch(() => {
      if (!cancelled) setError("Cannot reach API. Check API base URL or start the backend.");
    });
  return () => { cancelled = true; };
}, [apiBase]);

  
  // Catalog mode state
  const [anchorFile, setAnchorFile] = useState(null);
  const [allowTypes, setAllowTypes] = useState(new Set(BUCKETS));
  const [colorMode, setColorMode] = useState("auto");
  const [perBucket, setPerBucket] = useState(5);
  const [topk, setTopk] = useState(20);
  const [colorWeight, setColorWeight] = useState(0.1);

  // Wardrobe mode state
  const [wardrobe, setWardrobe] = useState({ 
    tops: [], 
    bottoms: [], 
    outerwear: [], 
    footwear: [] 
  });

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogResults, setCatalogResults] = useState(null);
  const [wardrobeResults, setWardrobeResults] = useState(null);

  // Memoized values
  const allowTypesString = useMemo(() => Array.from(allowTypes).join(","), [allowTypes]);
  
  const totalWardrobeItems = useMemo(
    () => BUCKETS.reduce((acc, bucket) => acc + wardrobe[bucket].length, 0),
    [wardrobe]
  );

  // Optimized handlers
  const handleAddWardrobe = useCallback((bucket, files) => {
    setWardrobe(prev => ({ 
      ...prev, 
      [bucket]: [...prev[bucket], ...files.slice(0, 8)] // Limit to 8 items per bucket
    }));
  }, []);

  const handleRemoveWardrobe = useCallback((bucket, index) => {
    setWardrobe(prev => ({
      ...prev,
      [bucket]: prev[bucket].filter((_, i) => i !== index)
    }));
  }, []);

  const toggleAllowType = useCallback((type) => {
    setAllowTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleAnchorFiles = useCallback((files) => {
    if (files.length > 0) {
      setAnchorFile(files[0]);
    }
  }, []);

  // API calls with optimized error handling
  const runCatalogRecommendation = useCallback(async () => {
    if (!anchorFile) {
      setError("Please upload an image first");
      return;
    }

    setIsLoading(true);
    setError("");
    setCatalogResults(null);

    if (allowTypes.size === 0) {
      setIsLoading(false);
      setError("Select at least one category.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", anchorFile);

      const params = new URLSearchParams({
        allow_types: allowTypesString,
        per_bucket: String(perBucket),
        topk: String(topk),
        color_weight: String(colorWeight),
        anchor_color_mode: colorMode,
        filter_same_bucket: "true",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(`${apiBase}/recommend?${params}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      setCatalogResults(result);

    } catch (error) {
      if (error.name === 'AbortError') {
        setError("Request timed out. Please try again with a smaller image or reduce the number of recommendations.");
      } else {
        setError(error.message || "Failed to get recommendations");
      }
      console.error("Catalog recommendation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [anchorFile, allowTypesString, perBucket, topk, colorWeight, colorMode, apiBase]);

  const runWardrobeRecommendation = useCallback(async () => {
    if (totalWardrobeItems < 2) {
      setError("Add at least 2 clothing items across different categories");
      return;
    }

    const categoriesWithItems = BUCKETS.filter(bucket => wardrobe[bucket].length > 0);
    if (categoriesWithItems.length < 2) {
      setError("Add items to at least 2 different categories");
      return;
    }

    setIsLoading(true);
    setError("");
    setWardrobeResults(null);

    try {
      const formData = new FormData();
      
      BUCKETS.forEach(bucket => {
        wardrobe[bucket].forEach(file => {
          formData.append(bucket, file);
        });
      });
      
      formData.append("topk", String(Math.min(topk, 15))); // Cap at 15 for performance

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for wardrobe

      const response = await fetch(`${apiBase}/wardrobe/recommend`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      setWardrobeResults(result);

    } catch (error) {
      if (error.name === 'AbortError') {
        setError("Request timed out. Please try reducing the number of items or recommendations.");
      } else {
        setError(error.message || "Failed to generate outfit combinations");
      }
      console.error("Wardrobe recommendation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [wardrobe, totalWardrobeItems, topk, apiBase]);

  // Optimized results components
  const CatalogResults = React.memo(({ results, apiBase }) => {
    if (!results || !results.items?.length) {
      return <div className="text-sm text-zinc-600">No recommendations found</div>;
    }

    return (
      <div className="space-y-4">
        {results.anchor_color && (
          <div className="text-sm text-zinc-700">
            Detected anchor color: <span className="font-semibold">{results.anchor_color}</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.items.map((item, index) => (
            <Card key={`${item.item_id}-${index}`}>
              <div className="aspect-square overflow-hidden rounded-xl">
                <img
                  src={`${apiBase}${item.preview_url}`}
                  alt={item.title || item.category}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="%23666">No Image</text></svg>`;
                  }}
                />
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2 text-sm font-medium text-zinc-900">
                    {item.title || humanize(item.category)}
                  </div>
                  <Tag>{humanize(item.bucket || item.category)}</Tag>
                </div>
                <div className="text-xs text-zinc-500">
                  Score: {item.score?.toFixed?.(3)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  });

  const WardrobeResults = React.memo(({ results, wardrobe }) => {
    const urlCache = useMemo(() => {
      const cache = {};
      BUCKETS.forEach(bucket => {
        cache[bucket] = (wardrobe[bucket] || []).map(file => createBlobURL(file));
      });
      return cache;
    }, [wardrobe]);

    // Cleanup URLs on unmount
    useEffect(() => {
      return () => {
        Object.values(urlCache).forEach(urls => {
          urls.forEach(url => URL.revokeObjectURL(url));
        });
      };
    }, [urlCache]);

    if (!results || !results.items?.length) {
      return <div className="text-sm text-zinc-600">No outfit combinations found</div>;
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.items.map((combo, index) => (
          <Card key={index}>
            <div className={cn(
              "grid gap-2",
              combo.parts.length <= 2 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {combo.parts.slice(0, 4).map((part, partIndex) => (
                <div key={partIndex} className="aspect-square overflow-hidden rounded-xl">
                  <img
                    src={
                      urlCache[part.slot]?.[part.idx] ||
                      `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23f3f4f6'/></svg>`
                    }
                    alt={`${part.slot}-${part.idx}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f3f4f6"/></svg>`;
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-900">
                  Outfit #{index + 1}
                </div>
                <Tag>{combo.parts.map(p => humanize(p.slot)).join(" • ")}</Tag>
              </div>
              <div className="text-xs text-zinc-500">
                Score: {combo.score?.toFixed?.(3)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-xl font-bold tracking-tight">Outfit Recommender</div>
          <div className="flex items-center gap-3">
            <input
              className="w-[300px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="API base URL"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
            <div className="flex rounded-full bg-zinc-100 p-1 text-sm">
              <button
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  tab === "catalog" ? "bg-white shadow" : "text-zinc-600 hover:text-zinc-900"
                )}
                onClick={() => setTab("catalog")}
              >
                Catalog
              </button>
              <button
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  tab === "wardrobe" ? "bg-white shadow" : "text-zinc-600 hover:text-zinc-900"
                )}
                onClick={() => setTab("wardrobe")}
              >
                Wardrobe
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === "catalog" ? (
          <Card>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <SectionTitle>User Photo</SectionTitle>
                  {!anchorFile ? (
                    <DropZone 
                      label="Upload your photo" 
                      onFiles={handleAnchorFiles}
                      disabled={isLoading}
                    />
                  ) : (
                    <div className="flex items-start gap-4">
                      <ImagePreview 
                        file={anchorFile} 
                        className="h-40 w-40"
                      />
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-zinc-700">{anchorFile.name}</div>
                        <Button 
                          onClick={() => setAnchorFile(null)}
                          className="bg-zinc-900 text-white"
                          disabled={isLoading}
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <SectionTitle>Results</SectionTitle>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"></div>
                      Analyzing your photo and finding matches...
                    </div>
                  )}
                  {catalogResults && <CatalogResults results={catalogResults} apiBase={apiBase} />}
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle>Options</SectionTitle>
                
                <div>
                  <div className="mb-2 text-sm font-medium">Allow Categories</div>
                  <div className="grid grid-cols-2 gap-2">
                    {BUCKETS.map(bucket => (
                      <label key={bucket} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allowTypes.has(bucket)}
                          onChange={() => toggleAllowType(bucket)}
                          disabled={isLoading}
                        />
                        <span className="text-sm">{humanize(bucket)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">Per Category</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={perBucket}
                      onChange={(e) => setPerBucket(Number(e.target.value) || 5)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">Total Results</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={topk}
                      onChange={(e) => setTopk(Number(e.target.value) || 20)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">Color Mode</label>
                    <select
                      value={colorMode}
                      onChange={(e) => setColorMode(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      disabled={isLoading}
                    >
                      <option value="auto">Auto</option>
                      <option value="hsv">HSV</option>
                      <option value="km">K-Means</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">Color Weight</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={colorWeight}
                      onChange={(e) => setColorWeight(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  onClick={runCatalogRecommendation}
                  disabled={!anchorFile || isLoading}
                  className="w-full bg-zinc-900 text-white"
                >
                  {isLoading ? "Finding Matches..." : "Get Recommendations"}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <SectionTitle>My Wardrobe ({totalWardrobeItems} items)</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {BUCKETS.map(bucket => (
                      <div key={bucket}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium">{humanize(bucket)}</div>
                          <Tag>{wardrobe[bucket].length} items</Tag>
                        </div>
                        
                        <DropZone
                          label={`Add ${humanize(bucket)}`}
                          multiple
                          onFiles={(files) => handleAddWardrobe(bucket, files)}
                          disabled={isLoading}
                        />
                        
                        {wardrobe[bucket].length > 0 && (
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {wardrobe[bucket].map((file, index) => (
                              <ImagePreview
                                key={`${bucket}-${index}`}
                                file={file}
                                onRemove={() => handleRemoveWardrobe(bucket, index)}
                                className="h-16"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle>Outfit Suggestions</SectionTitle>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"></div>
                      Analyzing your wardrobe and creating outfit combinations...
                    </div>
                  )}
                  {wardrobeResults && <WardrobeResults results={wardrobeResults} wardrobe={wardrobe} />}
                </div>
              </div>

              <div className="space-y-4">
                <SectionTitle>Options</SectionTitle>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Max Outfits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={topk}
                    onChange={(e) => setTopk(Number(e.target.value) || 10)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={runWardrobeRecommendation}
                  disabled={totalWardrobeItems < 2 || isLoading}
                  className="w-full bg-zinc-900 text-white"
                >
                  {isLoading ? "Creating Outfits..." : "Generate Outfit Ideas"}
                </Button>

                <div className="text-xs text-zinc-500">
                  Tip: Add at least 2 categories (e.g., tops + bottoms) for best results. 
                  Outerwear and footwear are optional but enhance combinations.
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}