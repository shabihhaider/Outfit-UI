import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload as IconUpload,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
  ImageOff,
  RefreshCw,
  Cog,
  SlidersHorizontal,
  Cloud,
  CloudOff,
  Sparkles,
  Heart,
  Star,
  Palette
} from "lucide-react";

// Constants + Utils
const BUCKETS = ["tops", "bottoms", "outerwear", "footwear"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const cn = (...classes) => classes.filter(Boolean).join(" ");
const humanize = (str) => str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Persist simple state
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

// Progressive image with skeleton + fallback
const ProgressiveImg = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
      )}
      {error ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
          <ImageOff className="h-8 w-8" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full object-cover transition-all duration-500",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          )}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

// Safely turn a File/Blob (or a string URL) into a preview, with proper cleanup
const FileImage = React.memo(({ file, alt, className }) => {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let url = "";
    if (file instanceof Blob) {
      url = URL.createObjectURL(file);
      setSrc(url);
    } else if (typeof file === "string") {
      setSrc(file);
    } else {
      setSrc("");
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);
  return <ProgressiveImg src={src} alt={alt} className={className} />;
});

// Enhanced toast system
const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.duration ?? 4000);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);
  
  const ToastHost = () => (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm",
              t.variant === "error" 
                ? "border-red-200/50 bg-red-50/90" 
                : "border-emerald-200/50 bg-emerald-50/90"
            )}
          >
            {t.variant === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            )}
            <div className="text-sm">
              <div className="font-semibold">{t.title}</div>
              {t.message && <div className="text-slate-600">{t.message}</div>}
            </div>
            <button 
              onClick={() => remove(t.id)} 
              className="ml-auto rounded-full p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { push, ToastHost };
};

// Enhanced UI components
const Button = ({ className = "", disabled, children, icon: Icon, variant = "default", size = "md", ...props }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
      size === "sm" ? "px-3 py-1.5 text-sm rounded-xl" : "px-4 py-2.5 text-sm rounded-2xl",
      variant === "primary" && "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 focus:ring-violet-500",
      variant === "secondary" && "bg-white text-slate-700 border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 focus:ring-slate-500",
      variant === "ghost" && "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-500",
      variant === "default" && "bg-slate-900 text-white shadow-sm hover:shadow-md hover:bg-slate-800 focus:ring-slate-500",
      className
    )}
    disabled={disabled}
    {...props}
  >
    {Icon && <Icon className={cn("h-4 w-4", size === "sm" && "h-3.5 w-3.5")} />}
    {children}
  </button>
);

const Card = ({ className = "", children, hover = false }) => (
  <motion.div 
    className={cn(
      "rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-sm shadow-sm",
      hover && "hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
      className
    )}
    whileHover={hover ? { y: -2 } : {}}
  >
    {children}
  </motion.div>
);

const Tag = ({ children, color = "default" }) => (
  <span className={cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
    color === "default" && "bg-slate-100 text-slate-700",
    color === "violet" && "bg-violet-100 text-violet-700",
    color === "emerald" && "bg-emerald-100 text-emerald-700"
  )}>
    {children}
  </span>
);

const SectionTitle = ({ children, icon: Icon }) => (
  <div className="mb-4 flex items-center gap-2">
    {Icon && <Icon className="h-5 w-5 text-slate-600" />}
    <h2 className="text-lg font-semibold text-slate-900">{children}</h2>
  </div>
);

function validateFile(file) {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported type: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`);
  }
  return true;
}

// Enhanced drop zone
const DropZone = ({ label, multiple = false, onFiles, hint, disabled }) => {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback(
    (files) => {
      const list = Array.from(files).filter((f) => {
        try {
          validateFile(f);
          return true;
        } catch (e) {
          console.warn("Skipping:", f.name, e.message);
          return false;
        }
      });
      list.length && onFiles(list);
    },
    [onFiles]
  );

  return (
    <motion.div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        !disabled && setDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        !disabled && handleFiles(e.dataTransfer.files || []);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300",
        disabled
          ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
          : drag
          ? "border-violet-400 bg-violet-50 scale-105"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50"
      )}
      role="button"
      aria-label={label}
      tabIndex={0}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <div className={cn(
        "rounded-full p-3 transition-colors",
        drag ? "bg-violet-100" : "bg-slate-200"
      )}>
        <IconUpload className={cn("h-6 w-6", drag ? "text-violet-600" : "text-slate-500")} />
      </div>
      <div className="space-y-1">
        <div className="font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">
          {hint || (multiple ? "Drag & drop or click to add images" : "Drag & drop or click to choose an image")}
        </div>
      </div>
      <input
        type="file"
        ref={inputRef}
        accept={SUPPORTED_TYPES.join(",")}
        multiple={multiple}
        onChange={(e) => {
          handleFiles(e.target.files || []);
          e.target.value = "";
        }}
        disabled={disabled}
        hidden
      />
    </motion.div>
  );
};

export default function App() {
  const [tab, setTab] = useLocalStorage("tab", "catalog");
  const defaultApi = typeof window !== "undefined" && window.location && (window.location.port === "8000" || window.location.hostname === "127.0.0.1")
    ? `${window.location.protocol}//${window.location.host}`
    : "http://127.0.0.1:8000";
  const [apiBase, setApiBase] = useLocalStorage("apiBase", defaultApi);

  const { push, ToastHost } = useToasts();

  // Health check
  const [health, setHealth] = useState({ ok: false, loading: true, msg: "" });
  const fetchHealth = useCallback(async () => {
    setHealth((h) => ({ ...h, loading: true }));
    try {
      const r = await fetch(`${apiBase}/health`);
      const j = await r.json();
      if (j.engine_loaded) setHealth({ ok: true, loading: false, msg: `Device: ${j.device} • Catalog: ${j.catalog_size}` });
      else setHealth({ ok: false, loading: false, msg: j.error ? `Backend not ready: ${j.error}` : "Backend not ready." });
    } catch (e) {
      setHealth({ ok: false, loading: false, msg: "Cannot reach API. Check URL or start backend." });
    }
  }, [apiBase]);
  
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // State
  const [anchorFile, setAnchorFile] = useState(null);
  const [allowTypesRaw, setAllowTypesRaw] = useLocalStorage("allowTypes", BUCKETS);
  const allowTypesSet = useMemo(() => new Set(Array.isArray(allowTypesRaw) ? allowTypesRaw : BUCKETS), [allowTypesRaw]);
  const [colorMode, setColorMode] = useLocalStorage("colorMode", "auto");
  const [perBucket, setPerBucket] = useLocalStorage("perBucket", 5);
  const [topk, setTopk] = useLocalStorage("topk", 20);
  const [colorWeight, setColorWeight] = useLocalStorage("colorWeight", 0.15);
  const [styleWeight, setStyleWeight] = useLocalStorage("styleWeight", 0.1);
  const [diversityWeight, setDiversityWeight] = useLocalStorage("diversityWeight", 0.05);
  const [density, setDensity] = useLocalStorage("density", "comfortable");
  // Files cannot be persisted to localStorage; keep wardrobe in memory only
const [wardrobe, setWardrobe] = useState({ tops: [], bottoms: [], outerwear: [], footwear: [] });

// (one-time safety: purge any old persisted wardrobe)
useEffect(() => {
  try { localStorage.removeItem("wardrobe"); } catch {}
}, []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogResults, setCatalogResults] = useState(null);
  const [wardrobeResults, setWardrobeResults] = useState(null);

  const allowTypesString = useMemo(() => Array.from(allowTypesSet).join(","), [allowTypesSet]);
  const totalWardrobeItems = useMemo(() => BUCKETS.reduce((acc, b) => acc + (wardrobe[b]?.length || 0), 0), [wardrobe]);

  // Helpers
  const toggleAllowType = useCallback((type) => {
    setAllowTypesRaw(prev => {
      const base = Array.isArray(prev) ? prev.slice() : BUCKETS.slice();
      const i = base.indexOf(type);
      if (i >= 0) base.splice(i, 1);
      else base.push(type);
      return base;
    });
  }, [setAllowTypesRaw]);

  const handleAnchorFiles = useCallback((files) => {
    files?.length && setAnchorFile(files[0]);
  }, []);

  const handleAddWardrobe = useCallback((bucket, files) => {
    setWardrobe((prev) => ({ ...prev, [bucket]: [...(prev[bucket] || []), ...files.slice(0, 8)] }));
  }, [setWardrobe]);

  const handleRemoveWardrobe = useCallback((bucket, index) => {
    setWardrobe((prev) => ({ ...prev, [bucket]: (prev[bucket] || []).filter((_, i) => i !== index) }));
  }, [setWardrobe]);

  // API calls
  const runCatalogRecommendation = useCallback(async () => {
    if (!anchorFile) return setError("Please upload an image first");
    if (allowTypesSet.size === 0) {
      setIsLoading(false);
      setError("Select at least one category.");
      return;
    }

    setIsLoading(true);
    setError("");
    setCatalogResults(null);

    try {
      const formData = new FormData();
      formData.append("image", anchorFile);
      const params = new URLSearchParams({
        allow_types: allowTypesString,
        per_bucket: String(perBucket),
        topk: String(topk),
        color_weight: String(colorWeight),
        style_weight: String(styleWeight),
        diversity_weight: String(diversityWeight),
        anchor_color_mode: String(colorMode),
        filter_same_bucket: "true",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${apiBase}/recommend?${params}`, { method: "POST", body: formData, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const json = await res.json();
      setCatalogResults(json);
      push({ title: "Recommendations ready", message: `${json.items?.length || 0} items`, variant: "ok" });
    } catch (e) {
      setError(e.message || "Failed to get recommendations");
      push({ title: "Recommendation failed", message: String(e.message || e), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [anchorFile, allowTypesString, perBucket, topk, colorWeight, styleWeight, diversityWeight, colorMode, apiBase, push, allowTypesSet.size]);

  const runWardrobeRecommendation = useCallback(async () => {
    if (totalWardrobeItems < 2) return setError("Add at least 2 clothing items");
    if (BUCKETS.filter((b) => (wardrobe[b]?.length || 0) > 0).length < 2) return setError("Use at least 2 categories");

    setIsLoading(true);
    setError("");
    setWardrobeResults(null);

    try {
      const formData = new FormData();
      BUCKETS.forEach((bucket) => (wardrobe[bucket] || []).forEach((f) => formData.append(bucket, f)));
      formData.append("topk", String(Math.min(topk, 15)));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${apiBase}/wardrobe/recommend`, { method: "POST", body: formData, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const json = await res.json();
      setWardrobeResults(json);
      push({ title: "Outfits ready", message: `${json.items?.length || 0} combos`, variant: "ok" });
    } catch (e) {
      setError(e.message || "Failed to generate outfits");
      push({ title: "Wardrobe failed", message: String(e.message || e), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [wardrobe, totalWardrobeItems, topk, apiBase, push]);

  const previewUrl = useCallback((api, item) => `${api}${item.preview_url}`.replace(/\/+$/, ""), []);

  // Enhanced skeletons
  const SkeletonGrid = ({ count = 8, size = "square" }) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className={cn("animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200", size === "square" ? "aspect-square" : "h-32")} />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        </Card>
      ))}
    </div>
  );

  // Enhanced results components
  const CatalogResults = ({ results }) => {
    if (!results || !results.items?.length) return <div className="text-sm text-slate-500">No recommendations found</div>;

    return (
      <div className="space-y-6">
        {results.anchor_color && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4"
          >
            <Palette className="h-5 w-5 text-violet-600" />
            <div className="flex items-center gap-2 text-sm text-violet-800">
              <span className="inline-flex h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ background: results.anchor_color }} />
              <span>Detected color: <span className="font-semibold">{results.anchor_color}</span></span>
            </div>
          </motion.div>
        )}
        <div className={cn("grid gap-6", density === "compact" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {results.items.map((item, idx) => (
            <motion.div 
              key={`${item.item_id}-${idx}`} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4 group" hover>
                <div className={cn("overflow-hidden rounded-2xl", density === "compact" ? "aspect-square" : "aspect-[4/3]")}>
                  <ProgressiveImg 
                    src={previewUrl(apiBase, item)} 
                    alt={item.title || item.category} 
                    className="h-full w-full rounded-2xl group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="truncate pr-2 font-medium text-slate-900">{item.title || humanize(item.category)}</div>
                    <Tag color="violet">{humanize(item.bucket || item.category)}</Tag>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{item.score?.toFixed?.(3)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const WardrobeResults = ({ results }) => {
    if (!results || !results.items?.length) {
      return <div className="text-sm text-slate-500">No outfit combinations found</div>;
    }

    return (
      <div className={cn("grid gap-6", density === "compact" ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
        {results.items.map((combo, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 group" hover>
              <div className="grid grid-cols-2 gap-3">
                {combo.parts.slice(0, 4).map((part, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-2xl">
                    <FileImage
                      file={wardrobe[part.slot]?.[part.idx]}
                      alt={`${part.slot}-${part.idx}`}
                      className="h-full w-full rounded-2xl group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">Outfit #{index + 1}</div>
                  <Tag color="emerald">{combo.parts.length} items</Tag>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                  <span>{combo.score?.toFixed?.(3)}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };


  // Health indicator
  const HealthPill = () => (
    <motion.div 
      className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium", 
        health.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"
      )}
      animate={{ scale: health.loading ? [1, 1.05, 1] : 1 }}
      transition={{ repeat: health.loading ? Infinity : 0, duration: 2 }}
    >
      {health.loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : health.ok ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Offline</span>
        </>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <ToastHost />
      
      {/* Enhanced Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  StyleAI
                </div>
                <div className="text-xs text-slate-500">Outfit Recommender</div>
              </div>
            </div>
            <HealthPill />
          </div>
          
          <div className="flex items-center gap-4">
            <input
              className="w-80 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm backdrop-blur-sm transition-all focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="API base URL"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
            <Button variant="secondary" icon={RefreshCw} onClick={fetchHealth}>
              Refresh
            </Button>
            
            <div className="flex rounded-2xl bg-slate-100/70 p-1">
              <button
                className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-all", 
                  tab === "catalog" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
                onClick={() => setTab("catalog")}
              >
                Catalog Search
              </button>
              <button
                className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-all", 
                  tab === "wardrobe" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
                onClick={() => setTab("wardrobe")}
              >
                My Wardrobe
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">{error}</div>
            <button className="rounded-full p-1 hover:bg-white/60 transition-colors" onClick={() => setError("")}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {tab === "catalog" ? (
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
              {/* Main Content */}
              <div className="space-y-8 xl:col-span-3">
                <div>
                  <SectionTitle icon={IconUpload}>Upload Your Photo</SectionTitle>
                  {!anchorFile ? (
                    <DropZone label="Upload your style reference" onFiles={handleAnchorFiles} disabled={isLoading} />
                  ) : (
                    <div className="flex items-start gap-6">
                      <div className="h-48 w-48 overflow-hidden rounded-3xl shadow-lg">
                        <ProgressiveImg 
                          src={URL.createObjectURL(anchorFile)} 
                          alt={anchorFile.name} 
                          className="h-full w-full rounded-3xl" 
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="text-sm text-slate-600">{anchorFile.name}</div>
                        <div className="flex gap-3">
                          <Button variant="secondary" onClick={() => setAnchorFile(null)}>
                            Replace Image
                          </Button>
                          <Button 
                            variant="primary" 
                            onClick={runCatalogRecommendation} 
                            disabled={isLoading} 
                            icon={isLoading ? Loader2 : Sparkles}
                          >
                            {isLoading ? "Finding Matches..." : "Get Recommendations"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <SectionTitle icon={Star}>Recommendations</SectionTitle>
                  {isLoading && <SkeletonGrid count={8} />}
                  {!isLoading && catalogResults && <CatalogResults results={catalogResults} />}
                  {!isLoading && !catalogResults && !error && (
                    <div className="text-center py-12 text-slate-500">
                      Upload an image to get personalized recommendations
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card className="p-5">
                  <SectionTitle icon={SlidersHorizontal}>Settings</SectionTitle>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Categories</label>
                      <div className="grid grid-cols-1 gap-2">
                        {BUCKETS.map((bucket) => (
                          <label key={bucket} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowTypesSet.has(bucket)}
                              onChange={() => toggleAllowType(bucket)}
                              disabled={isLoading}
                              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-sm text-slate-700">{humanize(bucket)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Per Category</label>
                        <input 
                          type="number" 
                          min={1} 
                          max={10} 
                          value={perBucket} 
                          onChange={(e) => setPerBucket(Number(e.target.value) || 5)} 
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none" 
                          disabled={isLoading} 
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Total Results</label>
                        <input 
                          type="number" 
                          min={1} 
                          max={50} 
                          value={topk} 
                          onChange={(e) => setTopk(Number(e.target.value) || 20)} 
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none" 
                          disabled={isLoading} 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Color Detection</label>
                      <select 
                        value={colorMode} 
                        onChange={(e) => setColorMode(e.target.value)} 
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none" 
                        disabled={isLoading}
                      >
                        <option value="auto">Auto Detection</option>
                        <option value="hsv">HSV Analysis</option>
                        <option value="kmeans">K-Means Clustering</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Display Density</label>
                      <select 
                        value={density} 
                        onChange={(e) => setDensity(e.target.value)} 
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none"
                      >
                        <option value="comfortable">Comfortable</option>
                        <option value="compact">Compact</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-medium text-slate-600">Advanced Weights</label>
                      <div className="space-y-2">
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Color Weight: {colorWeight}</label>
                          <input 
                            type="range" 
                            min={0} 
                            max={1} 
                            step={0.05} 
                            value={colorWeight} 
                            onChange={(e) => setColorWeight(Number(e.target.value))} 
                            className="w-full accent-violet-600" 
                            disabled={isLoading} 
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Style Weight: {styleWeight}</label>
                          <input 
                            type="range" 
                            min={0} 
                            max={1} 
                            step={0.05} 
                            value={styleWeight} 
                            onChange={(e) => setStyleWeight(Number(e.target.value))} 
                            className="w-full accent-violet-600" 
                            disabled={isLoading} 
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Diversity Weight: {diversityWeight}</label>
                          <input 
                            type="range" 
                            min={0} 
                            max={1} 
                            step={0.05} 
                            value={diversityWeight} 
                            onChange={(e) => setDiversityWeight(Number(e.target.value))} 
                            className="w-full accent-violet-600" 
                            disabled={isLoading} 
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={runCatalogRecommendation} 
                      disabled={!anchorFile || isLoading || allowTypesSet.size === 0} 
                      variant="primary"
                      className="w-full"
                      icon={isLoading ? Loader2 : Sparkles}
                    >
                      {isLoading ? "Analyzing..." : "Find Matches"}
                    </Button>
                    
                    <div className="text-xs text-slate-500 text-center">
                      Select categories and upload an image to get started
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
              {/* Wardrobe Content */}
              <div className="space-y-8 xl:col-span-3">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle icon={Heart}>My Wardrobe</SectionTitle>
                    <Tag color="violet">{totalWardrobeItems} items total</Tag>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {BUCKETS.map((bucket) => (
                      <Card key={bucket} className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="font-medium text-slate-800">{humanize(bucket)}</div>
                          <Tag color="emerald">{wardrobe[bucket]?.length || 0}</Tag>
                        </div>
                        
                        <DropZone 
                          label={`Add ${humanize(bucket)}`} 
                          multiple 
                          onFiles={(files) => handleAddWardrobe(bucket, files)} 
                          disabled={isLoading}
                          hint="Up to 8 items per category"
                        />
                        
                        {(wardrobe[bucket]?.length || 0) > 0 && (
                          <div className="mt-4 grid grid-cols-4 gap-2">
                            {wardrobe[bucket].map((file, index) => (
                              <motion.div 
                                key={`${bucket}-${index}`} 
                                className="relative group"
                                whileHover={{ scale: 1.05 }}
                                layout
                              >
                                <div className="aspect-square overflow-hidden rounded-xl">
                                  <FileImage 
                                    file={file} 
                                    alt={`${bucket}-${index}`} 
                                    className="h-full w-full rounded-xl" 
                                  />
                                </div>
                                <motion.button 
                                  onClick={() => handleRemoveWardrobe(bucket, index)} 
                                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <X className="h-3 w-3" />
                                </motion.button>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle icon={Sparkles}>Outfit Combinations</SectionTitle>
                  {isLoading && <SkeletonGrid count={6} size="wide" />}
                  {!isLoading && wardrobeResults && <WardrobeResults results={wardrobeResults} />}
                  {!isLoading && !wardrobeResults && !error && (
                    <div className="text-center py-12 text-slate-500">
                      Add items to your wardrobe to generate outfit combinations
                    </div>
                  )}
                </div>
              </div>

              {/* Wardrobe Sidebar */}
              <div className="space-y-6">
                <Card className="p-5">
                  <SectionTitle icon={Cog}>Generation Settings</SectionTitle>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Max Outfits</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={20} 
                        value={topk} 
                        onChange={(e) => setTopk(Number(e.target.value) || 10)} 
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none" 
                        disabled={isLoading} 
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Display Style</label>
                      <select 
                        value={density} 
                        onChange={(e) => setDensity(e.target.value)} 
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-300 focus:ring-2 focus:ring-violet-200 focus:outline-none"
                      >
                        <option value="comfortable">Comfortable Grid</option>
                        <option value="compact">Compact View</option>
                      </select>
                    </div>

                    <Button 
                      onClick={runWardrobeRecommendation} 
                      disabled={totalWardrobeItems < 2 || isLoading} 
                      variant="primary"
                      className="w-full"
                      icon={isLoading ? Loader2 : Sparkles}
                    >
                      {isLoading ? "Creating Outfits..." : "Generate Outfits"}
                    </Button>
                    
                    <div className="text-xs text-slate-500 text-center">
                      Add items from at least 2 categories to get started
                    </div>
                  </div>
                </Card>

                {/* Stats Card */}
                <Card className="p-5">
                  <h3 className="font-medium text-slate-800 mb-3">Wardrobe Stats</h3>
                  <div className="space-y-2">
                    {BUCKETS.map((bucket) => (
                      <div key={bucket} className="flex justify-between text-sm">
                        <span className="text-slate-600">{humanize(bucket)}</span>
                        <span className="font-medium">{wardrobe[bucket]?.length || 0}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Items</span>
                        <span className="text-violet-600">{totalWardrobeItems}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}