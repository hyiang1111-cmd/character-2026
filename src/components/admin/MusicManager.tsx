import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Upload,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Volume2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileAudio,
  Radio,
  Sliders,
  Link as LinkIcon,
  HardDrive
} from 'lucide-react';
import { MusicTrack, MusicSettings } from '../../types/music';
import {
  saveMusicSettings,
  saveMusicTrack,
  deleteMusicTrack,
  setActiveMusicTrack,
  uploadMusicFile,
  subscribeToMusicTracks,
  subscribeToMusicSettings
} from '../../services/storage';
import { useMusic } from '../../context/MusicContext';

interface MusicManagerProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const MusicManager: React.FC<MusicManagerProps> = ({ onShowToast }) => {
  const { previewTrack, previewingTrackId } = useMusic();

  const [settings, setSettings] = useState<MusicSettings | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadTab, setUploadTab] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [setAsActiveImmediately, setSetAsActiveImmediately] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // Settings form
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [defaultVolume, setDefaultVolume] = useState(0.35);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load and subscribe to real-time data
  useEffect(() => {
    const unsubSettings = subscribeToMusicSettings((data) => {
      setSettings(data);
      setMasterEnabled(data.enabled);
      setDefaultVolume(data.defaultVolume ?? 0.35);
      setLoopEnabled(data.loop ?? true);
      setLoading(false);
    });

    const unsubTracks = subscribeToMusicTracks((list) => {
      setTracks(list);
    });

    return () => {
      unsubSettings();
      unsubTracks();
      previewTrack(null); // Stop preview on unmount
    };
  }, []);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // File selection
  const handleFileSelect = (file: File) => {
    // Validate format
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
    const isAudio = allowed.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i);

    if (!isAudio) {
      onShowToast('error', 'Định dạng không hợp lệ', 'Vui lòng chọn file âm thanh định dạng MP3, WAV hoặc OGG.');
      return;
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      onShowToast('error', 'Dung lượng quá lớn', 'Kích thước file tối đa cho phép là 25 MB.');
      return;
    }

    setSelectedFile(file);
    if (!trackTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTrackTitle(cleanName);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadTab === 'file') {
      if (!selectedFile) {
        onShowToast('error', 'Chưa chọn file', 'Vui lòng chọn file MP3/WAV/OGG từ máy tính của bạn.');
        return;
      }
    } else {
      if (!directUrl.trim()) {
        onShowToast('error', 'Chưa nhập URL', 'Vui lòng nhập đường dẫn âm thanh hợp lệ.');
        return;
      }
    }

    const titleToUse = trackTitle.trim() || (selectedFile ? selectedFile.name : 'Nhạc nền mới');
    setIsUploading(true);
    setUploadProgress(10);

    try {
      let finalAudioUrl = directUrl.trim();
      let storagePath: string | undefined = undefined;
      let sizeBytes = 0;
      let sizeFormatted = 'Direct URL';
      let format = 'URL Audio';

      if (uploadTab === 'file' && selectedFile) {
        sizeBytes = selectedFile.size;
        sizeFormatted = formatBytes(selectedFile.size);
        format = selectedFile.type || 'MP3';

        const uploadRes = await uploadMusicFile(selectedFile, (pct) => {
          setUploadProgress(pct);
        });

        finalAudioUrl = uploadRes.url;
        storagePath = uploadRes.storagePath;
      }

      const trackId = 'track_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      const newTrack: MusicTrack = {
        id: trackId,
        title: titleToUse,
        url: finalAudioUrl,
        format,
        sizeBytes,
        sizeFormatted,
        storagePath,
        isActive: setAsActiveImmediately,
        createdAt: Date.now(),
      };

      // Save to Firestore
      await saveMusicTrack(newTrack);

      // If active option was selected, set as main BGM
      if (setAsActiveImmediately) {
        await setActiveMusicTrack(newTrack);
      }

      onShowToast(
        'success',
        'Tải nhạc lên thành công!',
        `Bài hát "${titleToUse}" đã được lưu trữ an toàn.`
      );

      // Reset form
      setSelectedFile(null);
      setTrackTitle('');
      setDirectUrl('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Upload track error:', err);
      onShowToast('error', 'Tải nhạc thất bại', err.message || 'Không thể tải file nhạc lên máy chủ.');
    } finally {
      setIsUploading(false);
    }
  };

  // Set active track
  const handleSetActive = async (track: MusicTrack) => {
    try {
      await setActiveMusicTrack(track);
      onShowToast('success', 'Đã đổi nhạc nền chính', `"${track.title}" hiện là nhạc nền của website.`);
    } catch (e: any) {
      onShowToast('error', 'Lỗi khi đổi nhạc', e.message);
    }
  };

  // Delete track
  const handleDelete = async (track: MusicTrack) => {
    const confirmDelete = window.confirm(`Bạn có chắc muốn xóa bài nhạc "${track.title}" khỏi kho lưu trữ?`);
    if (!confirmDelete) return;

    try {
      if (previewingTrackId === track.id) {
        previewTrack(null);
      }
      await deleteMusicTrack(track.id, track.storagePath);
      onShowToast('success', 'Đã xóa bài nhạc', `Bài hát "${track.title}" đã được xóa.`);
    } catch (e: any) {
      onShowToast('error', 'Lỗi xóa nhạc', e.message);
    }
  };

  // Save general settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveMusicSettings({
        enabled: masterEnabled,
        defaultVolume,
        loop: loopEnabled,
      });
      onShowToast('success', 'Cài đặt đã lưu', 'Cấu hình nhạc nền đã được cập nhật thành công.');
    } catch (e: any) {
      onShowToast('error', 'Lỗi lưu cấu hình', e.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F1D4DF]">
        <div>
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#865B9E]" />
            <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
              Quản lý Nhạc nền Website
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1">
            Tải lên, điều khiển và thiết lập nhạc nền phát toàn website sau khi người dùng nhấn ENTER.
          </p>
        </div>

        {/* Master Switch Status Pill */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-[#F1D4DF] shadow-xs">
          <span className="text-xs font-semibold text-[#51434A]">Nhạc toàn trang:</span>
          <button
            type="button"
            onClick={() => {
              const next = !masterEnabled;
              setMasterEnabled(next);
              saveMusicSettings({ enabled: next }).then(() => {
                onShowToast(
                  next ? 'success' : 'info',
                  next ? 'Đã bật nhạc nền' : 'Đã tắt nhạc nền toàn trang'
                );
              });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              masterEnabled ? 'bg-[#865B9E]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                masterEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`text-xs font-bold ${
              masterEnabled ? 'text-[#865B9E]' : 'text-gray-400'
            }`}
          >
            {masterEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </span>
        </div>
      </div>

      {/* Section 1: Upload New Music Track */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#865B9E]" />
            <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
              Tải nhạc nền mới lên
            </h3>
          </div>

          {/* Toggle upload mode */}
          <div className="flex bg-[#FAF6FC] p-1 rounded-full border border-[#F1D4DF] text-xs font-medium">
            <button
              type="button"
              onClick={() => setUploadTab('file')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                uploadTab === 'file'
                  ? 'bg-white text-[#51434A] shadow-xs font-semibold'
                  : 'text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              Tải file từ máy (MP3/WAV)
            </button>
            <button
              type="button"
              onClick={() => setUploadTab('url')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                uploadTab === 'url'
                  ? 'bg-white text-[#51434A] shadow-xs font-semibold'
                  : 'text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              Nhập link âm thanh (URL)
            </button>
          </div>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* File Drag & Drop Zone */}
          {uploadTab === 'file' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#865B9E] bg-[#E8D7F7]/30 scale-[1.01]'
                    : selectedFile
                    ? 'border-[#865B9E]/60 bg-[#FAF6FC]'
                    : 'border-[#F1D4DF] hover:border-[#865B9E]/50 hover:bg-[#FAF6FC]/60'
                }`}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-[#E8D7F7] flex items-center justify-center text-[#865B9E] shadow-xs">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm text-[#51434A]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#8E7A84]">
                      {formatBytes(selectedFile.size)} • Nhấn để chọn file khác
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-[#FAF6FC] border border-[#F1D4DF] flex items-center justify-center text-[#865B9E]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm text-[#51434A]">
                      Kéo thả file âm thanh vào đây hoặc nhấn để chọn
                    </p>
                    <p className="text-xs text-[#8E7A84]">
                      Hỗ trợ MP3, WAV, OGG (Tối đa 25 MB). Tự động lưu vào Firebase Storage.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Đường dẫn file âm thanh (Audio URL)
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://example.com/audio/my-background-music.mp3"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>
          )}

          {/* Track Title & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Tên bài nhạc hiển thị
              </label>
              <input
                type="text"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Ví dụ: Pastel Lavender Lullaby"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#51434A]">
                <input
                  type="checkbox"
                  checked={setAsActiveImmediately}
                  onChange={(e) => setSetAsActiveImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-[#865B9E] focus:ring-[#865B9E]/40"
                />
                <span>Đặt làm nhạc nền chính ngay sau khi tải lên</span>
              </label>
            </div>
          </div>

          {/* Progress bar if uploading */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-[#51434A] font-medium">
                <span>Đang tải lên Firebase Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#FAF6FC] overflow-hidden border border-[#F1D4DF]">
                <div
                  className="h-full bg-gradient-to-r from-[#E8D7F7] to-[#865B9E] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUploading || (uploadTab === 'file' && !selectedFile) || (uploadTab === 'url' && !directUrl.trim())}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold tracking-wide shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đang lưu...' : 'Lưu bài nhạc'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Uploaded Music Tracks List */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#865B9E]" />
            <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
              Kho nhạc nền ({tracks.length})
            </h3>
          </div>
          <span className="text-xs text-[#8E7A84]">
            Chỉ một bài được kích hoạt làm nhạc nền chính
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-10 space-y-3 bg-[#FAF6FC] rounded-2xl border border-dashed border-[#F1D4DF]">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#865B9E] mx-auto shadow-xs">
              <Music className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm text-[#51434A]">
              Chưa có bài nhạc nào được tải lên
            </p>
            <p className="text-xs text-[#8E7A84] max-w-sm mx-auto">
              Bạn có thể tải file MP3/WAV/OGG từ máy tính hoặc đặt file tĩnh tại <code className="bg-white px-1.5 py-0.5 rounded text-[#51434A]">public/audio/background-music.mp3</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => {
              const isCurrentActive =
                track.isActive || settings?.activeTrackId === track.id;
              const isThisPreviewing = previewingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  style={isCurrentActive ? { backgroundColor: '#F8F1FD' } : undefined}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrentActive
                      ? 'border-[#865B9E] shadow-xs'
                      : 'border-[#F1D4DF] bg-white hover:border-[#865B9E]/40'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => previewTrack(isThisPreviewing ? null : track)}
                      className={`p-2.5 rounded-full shrink-0 transition-all cursor-pointer shadow-2xs border ${
                        isThisPreviewing
                          ? 'bg-[#865B9E] text-white border-[#865B9E]'
                          : 'bg-white text-[#51434A] border-[#F1D4DF] hover:bg-[#FAF6FC]'
                      }`}
                      title={isThisPreviewing ? 'Dừng nghe thử' : 'Nghe thử bài này'}
                    >
                      {isThisPreviewing ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#51434A] truncate">
                          {track.title}
                        </span>
                        {isCurrentActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#865B9E] text-white text-[10px] font-bold shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ĐANG SỬ DỤNG</span>
                          </span>
                        )}
                        {isThisPreviewing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8D7F7] text-[#493B55] text-[10px] font-semibold animate-pulse">
                            Đang nghe thử
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8E7A84] mt-0.5">
                        <span>{track.format || 'Audio'}</span>
                        <span>•</span>
                        <span>{track.sizeFormatted || 'Unknown size'}</span>
                        <span>•</span>
                        <span>
                          Tải lên {new Date(track.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!isCurrentActive && (
                      <button
                        type="button"
                        onClick={() => handleSetActive(track)}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-[#865B9E] text-[#865B9E] hover:bg-[#E8D7F7]/40 text-xs font-semibold cursor-pointer transition-all shadow-2xs"
                      >
                        Chọn làm nhạc nền
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(track)}
                      className="p-2 rounded-xl bg-white border border-[#F1D4DF] text-rose-500 hover:bg-rose-50 hover:border-rose-200 text-xs cursor-pointer transition-all shadow-2xs"
                      title="Xóa bài nhạc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Static Fallback File Note */}
      <div className="p-5 rounded-3xl bg-[#FAF6FC] border border-[#E8D7F7] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white text-[#865B9E] shadow-2xs border border-[#F1D4DF] shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#51434A]">
              Tệp nhạc tĩnh mặc định (Local Static File)
            </h4>
            <p className="text-xs text-[#8E7A84] mt-0.5">
              Bạn có thể thay đổi bài hát bất kỳ lúc nào bằng cách đặt file MP3 vào thư mục dự án:{' '}
              <code className="text-[#6D4785] bg-white px-1.5 py-0.5 rounded font-mono border border-[#F1D4DF]">
                public/audio/background-music.mp3
              </code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            // Preset static file
            const localTrack: MusicTrack = {
              id: 'track_local_default',
              title: 'Default Background Music (Local)',
              url: '/audio/background-music.mp3',
              format: 'MP3',
              sizeBytes: 0,
              sizeFormatted: 'Local Asset',
              isActive: true,
              createdAt: Date.now(),
            };
            handleSetActive(localTrack);
          }}
          className="px-4 py-2 rounded-xl bg-white border border-[#F1D4DF] hover:border-[#865B9E] text-[#51434A] text-xs font-semibold hover:bg-[#FAF6FC] shrink-0 shadow-2xs transition-all cursor-pointer"
        >
          Sử dụng file local này
        </button>
      </div>

      {/* Section 4: General Music Settings */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6FC]">
          <Sliders className="w-4 h-4 text-[#865B9E]" />
          <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
            Cấu hình âm lượng & Phát lại
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Default Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#51434A]">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#865B9E]" />
                <span>Âm lượng khởi tạo mặc định:</span>
              </span>
              <span className="font-mono text-sm text-[#865B9E]">
                {Math.round(defaultVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={defaultVolume}
              onChange={(e) => setDefaultVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#FAF6FC] rounded-lg appearance-none cursor-pointer accent-[#865B9E]"
            />
            <p className="text-[11px] text-[#8E7A84]">
              Mức âm lượng ban đầu cho khách truy cập trước khi họ tự điều chỉnh.
            </p>
          </div>

          {/* Loop Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#51434A]">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-[#865B9E]" />
                <span>Chế độ lặp lại (Loop):</span>
              </span>
              <span
                className={`font-semibold ${
                  loopEnabled ? 'text-[#865B9E]' : 'text-gray-400'
                }`}
              >
                {loopEnabled ? 'BẬT' : 'TẮT'}
              </span>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer pt-2 text-xs font-medium text-[#51434A]">
              <input
                type="checkbox"
                checked={loopEnabled}
                onChange={(e) => setLoopEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-[#865B9E] focus:ring-[#865B9E]/40"
              />
              <span>Tự động phát lại bài hát khi kết thúc</span>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-[#FAF6FC] flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="px-6 py-2.5 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình âm thanh'}
          </button>
        </div>
      </div>
    </div>
  );
};
