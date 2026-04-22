'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Star,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Shield,
  Users,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  Home as HomeIcon,
  BarChart3,
  X,
  Loader2,
  Eye,
  Plus,
  Minus,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

/* ─── Types ─── */
interface FaceImage {
  id: string;
  subjectId: string;
  imageId: string;
  cloudinaryUrl: string;
  publicId: string;
  createdAt: string;
}

interface RatingRecord {
  raterId: string;
  subjectId: string;
  imageId: string;
  rating: number;
}

type PageView = 'home' | 'rate' | 'admin' | 'thankyou' | 'admin-login';

/* ─── Main App Component ─── */
export default function Home() {
  const [view, setView] = useState<PageView>('home');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Rating state
  const [images, setImages] = useState<FaceImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [sessionRatingMap, setSessionRatingMap] = useState<Record<string, number>>({});
  const [raterId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('faceRankRaterId');
      if (!id) {
        id = `Rater_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('faceRankRaterId', id);
      }
      return id;
    }
    return 'Rater_unknown';
  });

  // Admin state
  const [adminImages, setAdminImages] = useState<FaceImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // Toast
  const { toast } = useToast();

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
        setAdminImages(data.images);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;

    const record: RatingRecord = {
      raterId,
      subjectId: currentImage.subjectId,
      imageId: currentImage.imageId,
      rating,
    };

    const newRatings = [...ratings, record];
    setRatings(newRatings);

    // Save to session for duplicate prevention
    const key = `${currentImage.subjectId}_${currentImage.imageId}`;
    setSessionRatingMap((prev) => ({ ...prev, [key]: rating }));

    // Submit to Google Sheets via API
    try {
      await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error('Failed to submit to Google Sheets:', err);
    }

    // Move to next image
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView('thankyou');
    }
  };

  const handleAdminUpload = async (formData: FormData) => {
    setUploadProgress('uploading');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Upload successful!',
          description: `${formData.get('subjectId')} - ${formData.get('imageId')} uploaded.`,
        });
        setUploadProgress('success');
        loadImages();
        setTimeout(() => setUploadProgress('idle'), 2000);
      } else {
        toast({
          title: 'Upload failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
        setUploadProgress('error');
        setTimeout(() => setUploadProgress('idle'), 3000);
      }
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
      setUploadProgress('error');
      setTimeout(() => setUploadProgress('idle'), 3000);
    }
  };

  const handleDeleteImage = async (publicId: string) => {
    try {
      const res = await fetch(`/api/images?id=${encodeURIComponent(publicId)}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Image deleted', description: 'Image removed from Cloudinary.' });
        loadImages();
      } else {
        const data = await res.json();
        toast({
          title: 'Delete failed',
          description: data.error || 'Could not delete image.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Delete failed',
        description: 'Could not delete image.',
        variant: 'destructive',
      });
    }
  };

  const handleAdminLogin = (password: string) => {
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'faceadmin123';
    if (password === adminPass) {
      setAdminAuthenticated(true);
      setView('admin');
      loadImages();
      toast({ title: 'Admin access granted' });
    } else {
      toast({
        title: 'Invalid password',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const progressPercent = images.length > 0
    ? Math.round(((currentIndex + 1) / images.length) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Header view={view} onNavigate={setView} />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingScreen key="loading" />
          ) : view === 'home' ? (
            <HomePage key="home" onNavigate={setView} imageCount={images.length} />
          ) : view === 'admin-login' ? (
            <AdminLogin key="admin-login" onLogin={handleAdminLogin} />
          ) : view === 'admin' ? (
            <AdminPanel
              key="admin"
              images={adminImages}
              onUpload={handleAdminUpload}
              onDelete={handleDeleteImage}
              uploadProgress={uploadProgress}
              onRefresh={loadImages}
            />
          ) : view === 'rate' ? (
            images.length > 0 ? (
              <RatingInterface
                key="rate"
                images={images}
                currentIndex={currentIndex}
                onRate={handleRate}
                onPrev={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                progress={progressPercent}
                sessionRatingMap={sessionRatingMap}
                raterId={raterId}
                onSkip={() => {
                  if (currentIndex < images.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    setView('thankyou');
                  }
                }}
              />
            ) : (
              <NoImagesScreen key="no-images" />
            )
          ) : view === 'thankyou' ? (
            <ThankYouPage
              key="thankyou"
              ratingCount={ratings.length}
              onNavigate={setView}
            />
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-4 text-center text-sm text-muted-foreground border-t bg-white/50 backdrop-blur-sm">
        <p>Face Ranking System &mdash; AI Class Project</p>
      </footer>
    </div>
  );
}

/* ─── Header ─── */
function Header({ view, onNavigate }: { view: PageView; onNavigate: (v: PageView) => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FaceRank</span>
        </button>

        <nav className="flex items-center gap-2">
          {view !== 'rate' && view !== 'thankyou' && (
            <Button
              variant={view === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('home')}
              className="text-sm"
            >
              <HomeIcon className="w-4 h-4 mr-1" />
              Home
            </Button>
          )}
          {view !== 'admin' && view !== 'admin-login' && view !== 'thankyou' && (
            <Button
              variant={view === 'rate' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('rate')}
              className="text-sm"
            >
              <Users className="w-4 h-4 mr-1" />
              Rate Faces
            </Button>
          )}
          {view !== 'admin' && view !== 'admin-login' && view !== 'rate' && view !== 'thankyou' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('admin-login')}
              className="text-sm"
            >
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </Button>
          )}
          {(view === 'admin' || view === 'admin-login') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('home')}
              className="text-sm"
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Exit Admin
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ─── Home Page ─── */
function HomePage({ onNavigate, imageCount }: { onNavigate: (v: PageView) => void; imageCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-200"
      >
        <Star className="w-12 h-12 text-white fill-white" />
      </motion.div>

      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Face Ranking System
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Help us rate anonymized face images for our AI research project.
          Your participation is anonymous and appreciated.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="lg"
            onClick={() => onNavigate('rate')}
            disabled={imageCount === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-8 py-6 text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Rating
            <span className="ml-2 text-sm opacity-80">({imageCount} images)</span>
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('admin-login')}
            className="px-8 py-6 text-lg"
          >
            <Lock className="w-5 h-5 mr-2" />
            Admin Panel
          </Button>
        </motion.div>
      </div>

      {imageCount === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
        >
          No images uploaded yet. Please ask the admin to upload images first.
        </motion.p>
      )}

      <div className="grid grid-cols-3 gap-4 pt-4">
        {[
          { icon: ImageIcon, label: 'Anonymized', desc: 'No personal data' },
          { icon: Star, label: '1-5 Scale', desc: 'Simple rating' },
          { icon: Shield, label: 'Private', desc: 'Session-based' },
        ].map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="border-none shadow-sm bg-white/70">
            <CardContent className="pt-6 pb-4 flex flex-col items-center gap-1">
              <Icon className="w-6 h-6 text-emerald-500 mb-1" />
              <span className="font-semibold text-sm">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Admin Login ─── */
function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [password, setPassword] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lock className="w-7 h-7 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>Enter the admin password to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin(password)}
            />
          </div>
          <Button
            onClick={() => onLogin(password)}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Login
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Default password: faceadmin123
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Admin Panel ─── */
function AdminPanel({
  images,
  onUpload,
  onDelete,
  uploadProgress,
  onRefresh,
}: {
  images: FaceImage[];
  onUpload: (fd: FormData) => void;
  onDelete: (publicId: string) => void;
  uploadProgress: 'idle' | 'uploading' | 'success' | 'error';
  onRefresh: () => void;
}) {
  const [subjectId, setSubjectId] = useState('Sub_1');
  const [imageId, setImageId] = useState('Img_1');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('subjectId', subjectId);
    fd.append('imageId', imageId);
    onUpload(fd);
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Auto-increment imageId
    const match = imageId.match(/Img_(\d+)/);
    if (match) {
      setImageId(`Img_${Number(match[1]) + 1}`);
    }
  };

  const subjectGroups = images.reduce<Record<string, FaceImage[]>>((acc, img) => {
    if (!acc[img.subjectId]) acc[img.subjectId] = [];
    acc[img.subjectId].push(img);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Manage face images for rating</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshIcon className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Upload Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-500" />
            Upload New Image
          </CardTitle>
          <CardDescription>Upload anonymized face images to Cloudinary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject ID</Label>
              <div className="flex items-center gap-2">
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject ID" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => (
                      <SelectItem key={i} value={`Sub_${i + 1}`}>
                        Sub_{i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image ID</Label>
              <Input
                value={imageId}
                onChange={(e) => setImageId(e.target.value)}
                placeholder="e.g., Img_1"
              />
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-cover"
                />
                <p className="text-sm text-muted-foreground">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select an image (JPEG, PNG, WebP)
                </p>
                <p className="text-xs text-muted-foreground">Max size: 10MB</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadProgress === 'uploading'}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {uploadProgress === 'uploading' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading to Cloudinary...
              </>
            ) : uploadProgress === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Image Gallery */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                Uploaded Images
              </CardTitle>
              <CardDescription>{images.length} images total</CardDescription>
            </div>
            <Badge variant="secondary">{Object.keys(subjectGroups).length} subjects</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(subjectGroups).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No images uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(subjectGroups).map(([subId, imgs]) => (
                <div key={subId}>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="outline">{subId}</Badge>
                    <span className="text-muted-foreground">({imgs.length} images)</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imgs.map((img) => (
                      <div
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <img
                          src={img.cloudinaryUrl}
                          alt={`${img.subjectId} - ${img.imageId}`}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white text-xs font-medium">{img.imageId}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {deleteConfirmId === img.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  onDelete(img.publicId);
                                  setDeleteConfirmId(null);
                                }}
                                className="text-xs"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirmId(img.id)}
                              className="text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Rating Interface ─── */
function RatingInterface({
  images,
  currentIndex,
  onRate,
  onPrev,
  progress,
  sessionRatingMap,
  raterId,
  onSkip,
}: {
  images: FaceImage[];
  currentIndex: number;
  onRate: (rating: number) => void;
  onPrev: () => void;
  progress: number;
  sessionRatingMap: Record<string, number>;
  raterId: string;
  onSkip: () => void;
}) {
  const currentImage = images[currentIndex];
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const key = currentImage ? `${currentImage.subjectId}_${currentImage.imageId}` : '';
  const alreadyRated = sessionRatingMap[key];

  const handleStarClick = async (rating: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await onRate(rating);
    setTimeout(() => setIsSubmitting(false), 300);
  };

  if (!currentImage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg mx-auto space-y-6"
    >
      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            Image {currentIndex + 1} of {images.length}
          </span>
          <span className="text-emerald-600 font-semibold">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Subject Info */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {currentImage.subjectId}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {currentImage.imageId}
        </Badge>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-xs text-muted-foreground font-mono">{raterId.substring(0, 16)}...</span>
      </div>

      {/* Image Display */}
      <motion.div
        key={currentImage.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-2xl overflow-hidden shadow-xl border bg-white"
      >
        <img
          src={currentImage.cloudinaryUrl}
          alt={`Face image - ${currentImage.subjectId}`}
          className="w-full aspect-[3/4] object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge className="bg-black/60 text-white backdrop-blur-sm">
            {currentIndex + 1}/{images.length}
          </Badge>
        </div>
      </motion.div>

      {/* Already Rated Indicator */}
      {alreadyRated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            Previously rated: {alreadyRated} / 5
          </Badge>
        </motion.div>
      )}

      {/* Rating Buttons */}
      <Card className="shadow-md border-none">
        <CardContent className="pt-6 pb-6">
          <p className="text-center text-sm font-medium text-muted-foreground mb-4">
            How would you rate this face?
          </p>
          <div className="flex justify-center gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <motion.button
                key={rating}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onHoverStart={() => setHoveredStar(rating)}
                onHoverEnd={() => setHoveredStar(0)}
                onClick={() => handleStarClick(rating)}
                disabled={isSubmitting}
                className="group relative flex flex-col items-center gap-1"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    hoveredStar >= rating
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200'
                      : alreadyRated === rating
                      ? 'bg-amber-100 border-2 border-amber-300'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                      hoveredStar >= rating || alreadyRated === rating
                        ? 'text-white fill-white'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{rating}</span>
              </motion.button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Thank You Page ─── */
function ThankYouPage({
  ratingCount,
  onNavigate,
}: {
  ratingCount: number;
  onNavigate: (v: PageView) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-md mx-auto text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200"
      >
        <CheckCircle2 className="w-12 h-12 text-white" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Thank You!</h2>
        <p className="text-muted-foreground text-lg">
          Your ratings have been recorded successfully.
        </p>
      </div>

      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-emerald-600 fill-emerald-600" />
            <span className="text-2xl font-bold text-emerald-700">{ratingCount}</span>
            <span className="text-emerald-600">ratings submitted</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        All responses are anonymous and stored securely in Google Sheets for research purposes.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          onClick={() => onNavigate('home')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <HomeIcon className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── No Images Screen ─── */
function NoImagesScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-md mx-auto text-center space-y-4 py-12"
    >
      <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30" />
      <h2 className="text-2xl font-bold">No Images Available</h2>
      <p className="text-muted-foreground">
        There are no face images uploaded yet. Please ask the administrator to upload images first.
      </p>
    </motion.div>
  );
}

/* ─── Loading Screen ─── */
function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-4"
    >
      <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      <p className="text-muted-foreground text-sm">Loading images...</p>
    </motion.div>
  );
}

/* ─── Refresh Icon (simple SVG) ─── */
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
