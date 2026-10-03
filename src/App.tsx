import React, { useState, useEffect } from 'react';
import { AppView, StudioImage, VideoProject, DesignProject, AppSettings } from './types';
import { StorageService, defaultSettings } from './services/storageService';
import { Header } from './components/common/Header';
import { SplashScreen } from './components/common/SplashScreen';
import { AboutModal } from './components/common/AboutModal';
import { SettingsModal } from './components/common/SettingsModal';
import { VideoMaker } from './components/video/VideoMaker';
import { ImageGenerator } from './components/generator/ImageGenerator';
import { CreativeStudio } from './components/creative/CreativeStudio';
import { AiDesigner } from './components/designer/AiDesigner';
import { AiAssistant } from './components/assistant/AiAssistant';
import { GalleryProjects } from './components/gallery/GalleryProjects';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('videomaker');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Global Studio State
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [images, setImages] = useState<StudioImage[]>(() => StorageService.getImages());
  const [videoProjects, setVideoProjects] = useState<VideoProject[]>(() => StorageService.getVideoProjects());
  const [designProjects, setDesignProjects] = useState<DesignProject[]>(() => StorageService.getDesignProjects());

  // Cross-Studio Transfer States
  const [selectedStudioImage, setSelectedStudioImage] = useState<StudioImage | null>(null);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Image Added / Generated
  const handleImageAdded = (image: StudioImage) => {
    setImages((prev) => [image, ...prev.filter((i) => i.id !== image.id)]);
    StorageService.saveImage(image);
  };

  // Save Video Project
  const handleSaveVideoProject = (project: VideoProject) => {
    setVideoProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
    StorageService.saveVideoProject(project);
  };

  // Save Design Project
  const handleSaveDesignProject = (design: DesignProject) => {
    setDesignProjects((prev) => [design, ...prev.filter((d) => d.id !== design.id)]);
    StorageService.saveDesignProject(design);
  };

  // Cross-Studio Navigation Handlers
  const handleSendToVideoMaker = (image: StudioImage) => {
    handleImageAdded(image);
    setCurrentView('videomaker');
  };

  const handleSendToStudio = (image: StudioImage) => {
    setSelectedStudioImage(image);
    setCurrentView('studio');
  };

  const handleSendToDesigner = (image: StudioImage) => {
    setSelectedStudioImage(image);
    setCurrentView('designer');
  };

  // Delete Handlers
  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    StorageService.deleteImage(id);
  };

  const handleDeleteVideoProject = (id: string) => {
    setVideoProjects((prev) => prev.filter((p) => p.id !== id));
    StorageService.deleteVideoProject(id);
  };

  const handleDeleteDesignProject = (id: string) => {
    setDesignProjects((prev) => prev.filter((p) => p.id !== id));
    StorageService.deleteDesignProject(id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onEnter={() => setShowSplash(false)} />}

      {/* App Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAbout={() => setShowAbout(true)}
        projectsCount={images.length + videoProjects.length + designProjects.length}
      />

      {/* Main Studio Views */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'videomaker' && (
          <VideoMaker
            initialImages={images}
            onSaveProject={handleSaveVideoProject}
            onNavigateToGenerator={() => setCurrentView('generator')}
            settings={settings}
          />
        )}

        {currentView === 'generator' && (
          <ImageGenerator
            onImageGenerated={handleImageAdded}
            onSendToVideoMaker={handleSendToVideoMaker}
            onSendToDesigner={handleSendToDesigner}
            onSendToStudio={handleSendToStudio}
            settings={settings}
          />
        )}

        {currentView === 'studio' && (
          <CreativeStudio
            initialImage={selectedStudioImage || (images.length > 0 ? images[0] : null)}
            onSaveImage={handleImageAdded}
            onSendToVideoMaker={handleSendToVideoMaker}
            onSendToDesigner={handleSendToDesigner}
            settings={settings}
          />
        )}

        {currentView === 'designer' && (
          <AiDesigner
            initialImage={selectedStudioImage}
            onSaveDesign={handleSaveDesignProject}
            settings={settings}
          />
        )}

        {currentView === 'assistant' && (
          <AiAssistant
            onSendToGenerator={(prompt) => {
              setCurrentView('generator');
            }}
            onSendToDesigner={(prompt) => {
              setCurrentView('designer');
            }}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryProjects
            images={images}
            videoProjects={videoProjects}
            designProjects={designProjects}
            onOpenImageInStudio={handleSendToStudio}
            onOpenImageInVideoMaker={handleSendToVideoMaker}
            onOpenImageInDesigner={handleSendToDesigner}
            onDeleteImage={handleDeleteImage}
            onDeleteVideoProject={handleDeleteVideoProject}
            onDeleteDesignProject={handleDeleteDesignProject}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
}
