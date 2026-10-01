import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Bell,
  Monitor,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Play,
  Moon,
  Sun,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playSound, speakText, SoundType } from '../../utils/audio';
import { isNotificationSupported, requestNotificationPermission } from '../../utils/notifications';
import { StorageService } from '../../services/storage';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, refreshData } = useApp();
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleTestSound = () => {
    playSound(settings.soundType, settings.soundVolume);
  };

  const handleTestSpeech = () => {
    speakText('Заканчивается текущий этап. Следующий пункт — Обсуждение.', settings.speechVoiceName);
  };

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    updateSettings({ notificationsEnabled: granted });
  };

  const handleExport = () => {
    const jsonStr = StorageService.exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronostage-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importAllDataJson(content);
      if (success) {
        refreshData();
        setImportStatus('Данные успешно импортированы!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Ошибка при импорте файла!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (window.confirm('Сбросить все данные к исходным демонстрационным шаблонам?')) {
      StorageService.resetAllData();
      refreshData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Настройки приложения
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Аудио, уведомления, тайм-менеджмент и резервные копии
        </p>
      </div>

      <div className="space-y-6">
        {/* Audio & Sound Effects */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Звуковые сигналы перехода</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <span>Включить звуковые сигналы при смене этапов</span>
              </label>
            </div>

            {settings.soundEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Тип звукового сигнала:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={settings.soundType}
                      onChange={(e) => updateSettings({ soundType: e.target.value as SoundType })}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-hidden"
                    >
                      <option value="chime">Хрустальный перезвон (Chime)</option>
                      <option value="bell">Резонансный колокол (Bell)</option>
                      <option value="beep">Двойной электронный (Beep)</option>
                      <option value="gong">Глубокий гонг (Gong)</option>
                    </select>
                    <button
                      onClick={handleTestSound}
                      className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-200 hover:text-white transition"
                    >
                      Тест
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Громкость: {Math.round(settings.soundVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Announcements (Speech Synthesis) */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Mic className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Голосовые подсказки (Web Speech)</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.speechEnabled}
                  onChange={(e) => updateSettings({ speechEnabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <span>Озвучивать окончание и следующий этап</span>
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Голосовой помощник предупреждает за 60 секунд: «Заканчивается Доклад... Следующий пункт — Обсуждение»
              </p>
            </div>

            {settings.speechEnabled && (
              <button
                onClick={handleTestSpeech}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-200 hover:text-white transition self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Прослушать пример</span>
              </button>
            )}
          </div>
        </div>

        {/* Screen WakeLock & Notifications */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Monitor className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Экран и фоновый режим</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.keepScreenAwake}
                onChange={(e) => updateSettings({ keepScreenAwake: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
              />
              <span>Не выключать экран во время работы таймера (Screen Wake Lock)</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">
                  Системные уведомления браузера
                </span>
                <span className="text-xs text-slate-400">
                  Оповещения в фоновом режиме на Android, Mac, Windows
                </span>
              </div>
              <button
                onClick={handleRequestNotifications}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition self-start sm:self-auto"
              >
                {typeof window !== 'undefined' && Notification.permission === 'granted'
                  ? 'Уведомления разрешены'
                  : 'Запросить разрешение'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Backup & Restore */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Download className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Резервное копирование и перенос данных</h2>
          </div>

          <p className="text-xs text-slate-400">
            Все ваши программы, календарные события и история хранятся локально на этом устройстве. Вы можете выгрузить файл резервной копии и перенести его на смартфон или другой компьютер.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              <Download className="w-4 h-4" />
              <span>Скачать резервную копию (.json)</span>
            </button>

            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Импорт из файла</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-900/40 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сбросить данные к демо</span>
            </button>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
              {importStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
