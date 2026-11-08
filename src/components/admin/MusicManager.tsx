import React, { useState, useEffect } from 'react';
import {
  Music,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Volume2,
  RotateCcw,
  Sliders,
  FileAudio,
  Link as LinkIcon,
  Info,
  Check,
  Eye,
  EyeOff,
  Edit2,
  X,
  Sparkles,
  Radio,
  Image as ImageIcon,
  User,
  ExternalLink
} from 'lucide-react';
import { MusicTrack, MusicSettings } from '../../types/music';
import {
  saveMusicSettings,
  saveMusicTrack,
  deleteMusicTrack,
  setActiveMusicTrack,
  toggleTrackPublicStatus,
  subscribeToMusicTracks,
  subscribeToMusicSettings
} from '../../services/storage';
import { useMusic } from '../../context/MusicContext';

interface MusicManagerProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

// Preset samples including Catbox and local audio
const SAMPLE_PRESETS: Array<{ title: string; artist: string; url: string; coverUrl: string; format: string }> = [
  {
    title: 'Character Archive Soft Melody',
    artist: 'Pink Archive Theme',
    url: '/audio/background-music.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80',
    format: 'Local MP3',
  },
  {
    title: 'Catbox Audio Stream Sample',
    artist: 'Catbox Cloud MP3',
    url: 'https://files.catbox.moe/sample.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
    format: 'Catbox Link',
  },
  {
    title: 'Pastel Lavender Piano Lullaby',
    artist: 'Dreamy Stories',
    url: '/audio/pastel-lullaby.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
    format: 'Local MP3',
  },
];

export const MusicManager: React.FC<MusicManagerProps> = ({ onShowToast }) => {
  const { previewTrack, previewingTrackId } = useMusic();

  const [settings, setSettings] = useState<MusicSettings | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);

  // Add / Edit form state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackCoverUrl, setTrackCoverUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [setAsActiveImmediately, setSetAsActiveImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings state
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [defaultVolume, setDefaultVolume] = useState(0.35);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Real-time synchronization for Admin (passes forAdmin = true)
  useEffect(() => {
    const unsubSettings = subscribeToMusicSettings((data) => {
      setSettings(data);
      setMasterEnabled(data.enabled);
      setDefaultVolume(data.defaultVolume ?? 0.35);
      setLoopEnabled(data.loop ?? true);
    });

    const unsubTracks = subscribeToMusicTracks((list) => {
      setTracks(list);
    }, true);

    return () => {
      unsubSettings();
      unsubTracks();
      previewTrack(null);
    };
  }, []);

  const resetForm = () => {
    setEditingTrackId(null);
    setTrackTitle('');
    setTrackArtist('');
    setTrackCoverUrl('');
    setAudioUrl('');
    setIsPublic(true);
    setSetAsActiveImmediately(false);
  };

  const handleEditClick = (track: MusicTrack) => {
    setEditingTrackId(track.id);
    setTrackTitle(track.title);
    setTrackArtist(track.artist || '');
    setTrackCoverUrl(track.coverUrl || '');
    setAudioUrl(track.url);
    setIsPublic(track.isPublic);
    setSetAsActiveImmediately(track.isActive);
    // Scroll smoothly to form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalUrl = audioUrl.trim();
    if (!finalUrl) {
      onShowToast(
        'error',
        'Thiếu đường dẫn nhạc',
        'Vui lòng nhập đường dẫn Audio URL (ví dụ link Catbox https://files.catbox.moe/...mp3 hoặc file /audio/...).'
      );
      return;
    }

    const titleToUse = trackTitle.trim() || 'Nhạc nền Archive';
    const artistToUse = trackArtist.trim() || 'Pink Character Archive';
    setIsSubmitting(true);

    try {
      const trackId = editingTrackId || 'track_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      const isCatbox = finalUrl.includes('catbox.moe');
      const isLocalPath = finalUrl.startsWith('/audio/') || finalUrl.startsWith('./audio/');

      let format = 'Audio Link';
      if (isCatbox) format = 'Catbox MP3';
      else if (isLocalPath) format = 'Local File';
      else if (finalUrl.endsWith('.mp3')) format = 'Direct MP3';

      const trackPayload: MusicTrack = {
        id: trackId,
        title: titleToUse,
        artist: artistToUse,
        coverUrl: trackCoverUrl.trim(),
        url: finalUrl,
        format,
        isPublic,
        isActive: setAsActiveImmediately,
        createdAt: editingTrackId
          ? tracks.find((t) => t.id === editingTrackId)?.createdAt || Date.now()
          : Date.now(),
        updatedAt: Date.now(),
      };

      // Save metadata directly to Firestore
      await saveMusicTrack(trackPayload);

      // Set as active background track if checked
      if (setAsActiveImmediately) {
        await setActiveMusicTrack(trackPayload);
      }

      onShowToast(
        'success',
        editingTrackId ? 'Đã cập nhật bài hát!' : 'Đã lưu bài hát mới vào Firestore!',
        `"${titleToUse}" đã được cập nhật thành công cho tất cả người xem.`
      );

      resetForm();
    } catch (err: any) {
      console.error('Error saving music track:', err);
      onShowToast('error', 'Lỗi lưu bài hát', err?.message || 'Không thể cập nhật Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (track: MusicTrack) => {
    try {
      await toggleTrackPublicStatus(track.id, track.isPublic);
      onShowToast(
        'info',
        track.isPublic ? 'Đã ẩn bài hát' : 'Đã bật hiển thị công khai',
        `Bài hát "${track.title}" hiện ${track.isPublic ? 'chỉ Admin nhìn thấy' : 'công khai cho tất cả người xem'}.`
      );
    } catch (e: any) {
      onShowToast('error', 'Lỗi đổi trạng thái', e?.message);
    }
  };

  const handleSetActive = async (track: MusicTrack) => {
    try {
      await setActiveMusicTrack(track);
      onShowToast('success', 'Đã thay đổi nhạc nền chính', `"${track.title}" hiện là bài phát mặc định của website.`);
    } catch (e: any) {
      onShowToast('error', 'Lỗi đổi nhạc chính', e?.message);
    }
  };

  const handleDelete = async (track: MusicTrack) => {
    const confirmDelete = window.confirm(`Bạn có chắc muốn xóa bài nhạc "${track.title}" khỏi Firestore?`);
    if (!confirmDelete) return;

    try {
      if (previewingTrackId === track.id) {
        previewTrack(null);
      }
      await deleteMusicTrack(track.id);
      onShowToast('success', 'Đã xóa bài nhạc', `Bài hát "${track.title}" đã được xóa vĩnh viễn.`);
      if (editingTrackId === track.id) {
        resetForm();
      }
    } catch (e: any) {
      onShowToast('error', 'Lỗi xóa bài nhạc', e?.message);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveMusicSettings({
        enabled: masterEnabled,
        defaultVolume,
        loop: loopEnabled,
      });
      onShowToast('success', 'Đã lưu cấu hình âm thanh', 'Cài đặt phát nhạc nền đã được lưu thành công.');
    } catch (e: any) {
      onShowToast('error', 'Lỗi lưu cài đặt', e?.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F1D4DF]">
        <div>
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-[#865B9E]" />
            <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
              Quản lý Danh sách Nhạc nền (Firestore)
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1">
            Lưu trực tiếp link nhạc (Catbox, MP3...) vào Firestore. Mọi thay đổi sẽ tự động đồng bộ thời gian thực cho người dùng toàn trang mà không cần redeploy!
          </p>
        </div>

        {/* Master Switch Status Toggle */}
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
                  next ? 'Đã bật nhạc toàn trang' : 'Đã tắt nhạc toàn trang'
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

      {/* Catbox / Direct URL Tip Box */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#FAF6FC] to-[#F8F1FD] border border-[#E8D7F7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-[#51434A]">
            <Sparkles className="w-5 h-5 text-[#865B9E]" />
            <span>Mẹo: Thêm bài hát bằng đường link audio trực tiếp (Đặc biệt là Catbox.moe)</span>
          </div>
          <a
            href="https://catbox.moe"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#865B9E] hover:underline"
          >
            <span>Đến Catbox.moe</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-[#55445F] leading-relaxed">
          1. Tải file âm thanh MP3 lên <strong>Catbox.moe</strong> để nhận link dạng: <code className="bg-white px-2 py-0.5 rounded font-mono text-[#6D4785] border border-[#E8D7F7]">https://files.catbox.moe/abcxyz.mp3</code><br/>
          2. Dán link vừa lấy vào khung dưới đây, nhập Tên bài hát + Ca sĩ và bấm <strong>"Lưu bài hát"</strong>.<br/>
          3. Danh sách trên giao diện chính của tất cả khách truy cập sẽ ngay lập tức được cập nhật mà không phải tải lại trang!
        </p>
      </div>

      {/* Form Section: Create / Edit Track */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
          <div className="flex items-center gap-2">
            {editingTrackId ? <Edit2 className="w-5 h-5 text-[#865B9E]" /> : <Plus className="w-5 h-5 text-[#865B9E]" />}
            <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
              {editingTrackId ? 'Chỉnh sửa thông tin bài hát' : 'Thêm bài hát mới vào Firestore'}
            </h3>
          </div>
          {editingTrackId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs text-rose-500 hover:underline font-medium cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy chỉnh sửa</span>
            </button>
          )}
        </div>

        {/* Preset Sample Quick Selectors */}
        {!editingTrackId && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider">
              Chọn nhanh mẫu có sẵn
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setAudioUrl(preset.url);
                    setTrackTitle(preset.title);
                    setTrackArtist(preset.artist);
                    setTrackCoverUrl(preset.coverUrl);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    audioUrl === preset.url
                      ? 'border-[#865B9E] bg-[#FAF6FC] ring-1 ring-[#865B9E]/40'
                      : 'border-[#F1D4DF] bg-white hover:bg-[#FAF6FC]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#51434A] truncate">
                      {preset.title}
                    </span>
                    {audioUrl === preset.url && (
                      <Check className="w-3.5 h-3.5 text-[#865B9E] shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#8E7A84] block truncate">
                    {preset.artist} ({preset.format})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSaveTrack} className="space-y-4 pt-2 border-t border-[#FAF6FC]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Đường dẫn Nhạc Audio (Catbox.moe / Direct MP3 URL) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://files.catbox.moe/example.mp3 hoặc /audio/background-music.mp3"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30 font-mono"
                />
              </div>
            </div>

            {/* Song Title */}
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Tên bài hát <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Music className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="Ví dụ: Lover (Acoustic Version)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>

            {/* Artist Name */}
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Nghệ sĩ / Ca sĩ
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={trackArtist}
                  onChange={(e) => setTrackArtist(e.target.value)}
                  placeholder="Ví dụ: Taylor Swift"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>

            {/* Cover URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Ảnh bìa bài hát (URL hình ảnh)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={trackCoverUrl}
                  onChange={(e) => setTrackCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... hoặc để trống để dùng ảnh mặc định"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#FAF6FC]">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#51434A]">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-[#865B9E] focus:ring-[#865B9E]/40"
                />
                <span>Hiển thị công khai cho tất cả người xem</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#51434A]">
                <input
                  type="checkbox"
                  checked={setAsActiveImmediately}
                  onChange={(e) => setSetAsActiveImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-[#865B9E] focus:ring-[#865B9E]/40"
                />
                <span>Đặt làm nhạc nền mặc định ngay khi lưu</span>
              </label>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {editingTrackId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-full bg-white border border-[#F1D4DF] text-[#51434A] text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !audioUrl.trim() || !trackTitle.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold tracking-wide shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {editingTrackId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Đang lưu vào Firestore...' : editingTrackId ? 'Cập nhật bài hát' : 'Lưu bài hát'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Playlist Section: Display Tracks Stored in Firestore */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#865B9E]" />
            <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
              Danh sách nhạc trên Firestore ({tracks.length})
            </h3>
          </div>
          <span className="text-xs text-[#8E7A84]">
            Tự động phát & đồng bộ realtime toàn trang
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-10 space-y-3 bg-[#FAF6FC] rounded-2xl border border-dashed border-[#F1D4DF]">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#865B9E] mx-auto shadow-xs">
              <Music className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm text-[#51434A]">
              Chưa có bài hát nào trong Firestore
            </p>
            <p className="text-xs text-[#8E7A84] max-w-sm mx-auto">
              Hãy nhập đường dẫn link nhạc (ví dụ Catbox.moe) ở biểu mẫu trên hoặc bấm chọn mẫu nhanh.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => {
              const isCurrentActive = track.isActive || settings?.activeTrackId === track.id;
              const isThisPreviewing = previewingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  style={isCurrentActive ? { backgroundColor: '#F8F1FD' } : undefined}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isCurrentActive
                      ? 'border-[#865B9E] shadow-xs'
                      : 'border-[#F1D4DF] bg-white hover:border-[#865B9E]/40'
                  }`}
                >
                  {/* Left Column: Play Button, Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    {/* Play preview button */}
                    <button
                      type="button"
                      onClick={() => previewTrack(isThisPreviewing ? null : track)}
                      className={`p-3 rounded-full shrink-0 transition-all cursor-pointer shadow-2xs border ${
                        isThisPreviewing
                          ? 'bg-[#865B9E] text-white border-[#865B9E]'
                          : 'bg-white text-[#51434A] border-[#F1D4DF] hover:bg-[#FAF6FC]'
                      }`}
                      title={isThisPreviewing ? 'Tạm dừng nghe thử' : 'Nghe thử bài hát này'}
                    >
                      {isThisPreviewing ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Cover art image */}
                    <div className="w-12 h-12 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] overflow-hidden shrink-0 flex items-center justify-center">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Music className="w-5 h-5 text-[#865B9E]" />
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#51434A] truncate">
                          {track.title}
                        </span>
                        {track.artist && (
                          <span className="text-xs text-[#8E7A84] font-medium">
                            • {track.artist}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8E7A84] mt-1">
                        <code className="font-mono text-[#6D4785] bg-white/90 px-2 py-0.5 rounded border border-[#F1D4DF] truncate max-w-[200px] sm:max-w-[260px]">
                          {track.url}
                        </code>
                        <span>•</span>
                        <span className="font-semibold text-[#865B9E]">{track.format || 'Audio URL'}</span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {isCurrentActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#865B9E] text-white text-[10px] font-bold shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>NHẠC NỀN CHÍNH</span>
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            track.isPublic
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {track.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{track.isPublic ? 'Công khai' : 'Ẩn với khách'}</span>
                        </span>

                        {isThisPreviewing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8D7F7] text-[#493B55] text-[10px] font-semibold animate-pulse">
                            Đang nghe thử...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!isCurrentActive && (
                      <button
                        type="button"
                        onClick={() => handleSetActive(track)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#865B9E] text-[#865B9E] hover:bg-[#E8D7F7]/40 text-xs font-semibold cursor-pointer transition-all shadow-2xs"
                      >
                        Chọn làm nhạc chính
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(track)}
                      className="p-2 rounded-xl bg-white border border-[#F1D4DF] text-[#51434A] hover:bg-[#FAF6FC] text-xs cursor-pointer transition-all shadow-2xs"
                      title={track.isPublic ? 'Ẩn đối với người dùng' : 'Công khai cho người dùng'}
                    >
                      {track.isPublic ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditClick(track)}
                      className="p-2 rounded-xl bg-white border border-[#F1D4DF] text-[#865B9E] hover:bg-[#FAF6FC] text-xs cursor-pointer transition-all shadow-2xs"
                      title="Chỉnh sửa bài hát"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(track)}
                      className="p-2 rounded-xl bg-white border border-[#F1D4DF] text-rose-500 hover:bg-rose-50 hover:border-rose-200 text-xs cursor-pointer transition-all shadow-2xs"
                      title="Xóa vĩnh viễn khỏi Firestore"
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

      {/* Playback & Default Volume Settings */}
      <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6FC]">
          <Sliders className="w-5 h-5 text-[#865B9E]" />
          <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
            Cấu hình âm lượng & Chế độ phát lặp lại
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
              Mức âm lượng mặc định khi người xem lần đầu kích hoạt nhạc nền.
            </p>
          </div>

          {/* Loop Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#51434A]">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-[#865B9E]" />
                <span>Phát lặp lại (Loop):</span>
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
              <span>Tự động lặp lại bài hát khi kết thúc</span>
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
            {isSavingSettings ? 'Đang lưu...' : 'Lưu cài đặt âm thanh'}
          </button>
        </div>
      </div>
    </div>
  );
};
