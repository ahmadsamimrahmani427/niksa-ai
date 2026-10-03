import React, { useState } from 'react';
import { StudioImage, VideoProject, DesignProject } from '../../types';
import { ImageProcessingService } from '../../services/imageProcessingService';
import {
  FolderKanban,
  Download,
  Trash2,
  Edit2,
  Film,
  Layout,
  Wand2,
  Sparkles,
  ExternalLink,
  Search,
  Check,
} from 'lucide-react';

interface GalleryProjectsProps {
  images: StudioImage[];
  videoProjects: VideoProject[];
  designProjects: DesignProject[];
  onOpenImageInStudio: (image: StudioImage) => void;
  onOpenImageInVideoMaker: (image: StudioImage) => void;
  onOpenImageInDesigner: (image: StudioImage) => void;
  onDeleteImage: (id: string) => void;
  onDeleteVideoProject: (id: string) => void;
  onDeleteDesignProject: (id: string) => void;
}

export const GalleryProjects: React.FC<GalleryProjectsProps> = ({
  images,
  videoProjects,
  designProjects,
  onOpenImageInStudio,
  onOpenImageInVideoMaker,
  onOpenImageInDesigner,
  onDeleteImage,
  onDeleteVideoProject,
  onDeleteDesignProject,
}) => {
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'designs'>('all');
  const [search, setSearch] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<StudioImage | null>(null);

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(search.toLowerCase()) ||
    (img.prompt && img.prompt.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredVideos = videoProjects.filter((vid) =>
    vid.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDesigns = designProjects.filter((des) =>
    des.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadImage = (img: StudioImage) => {
    ImageProcessingService.downloadImage(img.url, `${img.name || 'niksa_image'}.png`);
  };

  const handleExportProjectJson = (project: VideoProject | DesignProject, type: 'video' | 'design') => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `niksa_${type}_project_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Header & Filter Toolbar */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Project & Asset Library</h2>
            <p className="text-xs text-slate-400">
              Manage your generated visuals, video timelines, and graphic designs
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
            {(['all', 'images', 'videos', 'designs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all ${
                  filter === tab
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Grid Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section: Images */}
        {(filter === 'all' || filter === 'images') && filteredImages.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Images & Generations ({filteredImages.length})</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/60 transition-all hover:border-cyan-500/50 hover:shadow-lg flex flex-col"
                >
                  <div
                    onClick={() => setPreviewImage(img)}
                    className="aspect-square w-full overflow-hidden bg-black cursor-pointer relative"
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] text-white font-medium truncate">
                        {img.name}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 flex items-center justify-between border-t border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenImageInStudio(img)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400"
                        title="Edit in Studio"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenImageInVideoMaker(img)}
                        className="p-1.5 text-slate-400 hover:text-purple-400"
                        title="Send to Video Maker"
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenImageInDesigner(img)}
                        className="p-1.5 text-slate-400 hover:text-sky-400"
                        title="Use in AI Designer"
                      >
                        <Layout className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadImage(img)}
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Download High-Res"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteImage(img.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Video Projects */}
        {(filter === 'all' || filter === 'videos') && filteredVideos.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              <span>Video Projects ({filteredVideos.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-sm truncate">{vid.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        {vid.resolution}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Clips: {vid.clips.length}</div>
                      <div>Duration: {vid.totalDuration.toFixed(1)}s</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleExportProjectJson(vid, 'video')}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={() => onDeleteVideoProject(vid.id)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Designs */}
        {(filter === 'all' || filter === 'designs') && filteredDesigns.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Layout className="w-4 h-4 text-sky-400" />
              <span>Designs ({filteredDesigns.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredDesigns.map((des) => (
                <div
                  key={des.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-sm truncate">{des.title}</h4>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {des.width}x{des.height}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Layers: {des.layers.length}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleExportProjectJson(des, 'design')}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={() => onDeleteDesignProject(des.id)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && videoProjects.length === 0 && designProjects.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-xs">
            No projects or saved assets yet. Create an image, video, or design to see them here!
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl p-4 flex flex-col gap-3"
          >
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[70vh] w-auto object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm">{previewImage.name}</div>
                {previewImage.prompt && (
                  <div className="text-xs text-slate-400 truncate max-w-md">{previewImage.prompt}</div>
                )}
              </div>
              <button
                onClick={() => handleDownloadImage(previewImage)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
