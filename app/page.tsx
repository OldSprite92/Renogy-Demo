'use client';

import {
  Armchair, BatteryCharging, Blinds, Camera, Check, ChevronRight, CircleDot,
  DoorClosed, Droplets, Film, Gauge, Languages, Lamp, Leaf, Lock, MapPin, Moon,
  Power, Radio, RotateCcw, ScanLine, ShieldAlert, ShieldCheck, Siren, Snowflake,
  Sparkles, Sun, TentTree, Thermometer, Tv, Volume2, Waves, Wifi, Wind, X, Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Locale = 'en' | 'zh';
type SceneKey = 'camp' | 'away' | 'movie' | 'sleep';
type IconName = 'lamp' | 'climate' | 'tv' | 'audio' | 'humidifier' | 'inverter' | 'lock' | 'blinds';
type LoadKey = 'climate' | 'lights' | 'shades' | 'tv' | 'humidifier' | 'ambient' | 'audio' | 'inverter' | 'lock';
type Localized = { en: string; zh: string };
type DeviceState = { icon: IconName; name: Localized; value: Localized; active: boolean };
type LoadState = { on: boolean; value: Localized };
type VisualLoad = { key: LoadKey; icon: LucideIcon; name: Localized; states: Record<SceneKey, LoadState> };
type Scene = {
  key: SceneKey; name: Localized; kicker: Localized; message: Localized; ready: Localized;
  time: string; solar: string; load: string; batteryFlow: string; runtime: string;
  temperature: string; inverter: Localized; security: boolean; sceneIcon: LucideIcon;
  steps: Localized[]; devices: DeviceState[];
};

const iconMap: Record<IconName, LucideIcon> = {
  lamp: Lamp, climate: Snowflake, tv: Tv, audio: Volume2, humidifier: Droplets,
  inverter: Zap, lock: Lock, blinds: Blinds,
};

const scenes: Record<SceneKey, Scene> = {
  camp: {
    key: 'camp', name: { en: 'Camp', zh: '驻车' },
    kicker: { en: 'Welcome to Pine Lake', zh: '欢迎抵达松湖营地' },
    message: { en: 'Your RV is level, connected and ready to enjoy.', zh: '房车已调平、连接完成，可以开始享受营地生活。' },
    ready: { en: 'Camp setup complete', zh: '驻车设置已完成' },
    time: '6:42 PM', solar: '1.42 kW', load: '420 W', batteryFlow: '+0.86 kW',
    runtime: '38 h', temperature: '23°', inverter: { en: 'Balanced', zh: '均衡模式' },
    security: false, sceneIcon: TentTree,
    steps: [
      { en: 'Auto-level complete', zh: '自动调平完成' },
      { en: 'Awning deployed', zh: '遮阳棚已展开' },
      { en: 'Climate set to 23°C', zh: '空调设定为23°C' },
    ],
    devices: [
      { icon: 'lamp', name: { en: 'Welcome lights', zh: '迎宾灯' }, value: { en: 'Warm · 65%', zh: '暖光 · 65%' }, active: true },
      { icon: 'climate', name: { en: 'Climate', zh: '空调' }, value: { en: 'Auto · 23°C', zh: '自动 · 23°C' }, active: true },
      { icon: 'humidifier', name: { en: 'Fresh air', zh: '新风' }, value: { en: 'Balanced', zh: '均衡运行' }, active: true },
      { icon: 'inverter', name: { en: 'Inverter', zh: '逆变器' }, value: { en: 'Balanced', zh: '均衡模式' }, active: true },
    ],
  },
  away: {
    key: 'away', name: { en: 'Away', zh: '外出' },
    kicker: { en: 'Explore with peace of mind', zh: '放心离开，安心探索' },
    message: { en: 'Protection is active while solar restores your range.', zh: '安防系统已布防，太阳能正在补充续航。' },
    ready: { en: 'Away mode secured', zh: '外出模式已布防' },
    time: '10:18 AM', solar: '1.42 kW', load: '96 W', batteryFlow: '+1.18 kW',
    runtime: '72 h+', temperature: '27°', inverter: { en: 'Eco', zh: '节能模式' },
    security: true, sceneIcon: ShieldCheck,
    steps: [
      { en: 'Climate and cabin loads off', zh: '空调及舱内负载已关闭' },
      { en: 'Doors and windows secured', zh: '门窗已锁定' },
      { en: 'Cameras and solar priority on', zh: '摄像头与太阳能优先已开启' },
    ],
    devices: [
      { icon: 'lock', name: { en: 'Smart lock', zh: '智能门锁' }, value: { en: 'Locked', zh: '已上锁' }, active: true },
      { icon: 'lamp', name: { en: 'Cabin lights', zh: '舱内灯光' }, value: { en: 'Off', zh: '已关闭' }, active: false },
      { icon: 'climate', name: { en: 'Climate', zh: '空调' }, value: { en: 'Powered off', zh: '已关闭' }, active: false },
      { icon: 'inverter', name: { en: 'Inverter', zh: '逆变器' }, value: { en: 'Eco', zh: '节能模式' }, active: true },
    ],
  },
  movie: {
    key: 'movie', name: { en: 'Movie', zh: '观影' },
    kicker: { en: 'Your private cinema is ready', zh: '你的私人影院已就绪' },
    message: { en: 'Lighting, sound and temperature are tuned for the moment.', zh: '灯光、声音与温度均已调整至最佳观影状态。' },
    ready: { en: 'Cinema atmosphere ready', zh: '影院氛围已就绪' },
    time: '8:12 PM', solar: '0.18 kW', load: '896 W', batteryFlow: '-0.71 kW',
    runtime: '17 h', temperature: '22°', inverter: { en: 'Performance', zh: '性能模式' },
    security: false, sceneIcon: Film,
    steps: [
      { en: 'Smart shades closed', zh: '智能遮阳帘已关闭' },
      { en: 'Cinema audio enabled', zh: '影院音响已开启' },
      { en: 'Ambient lights set to 30%', zh: '氛围灯已调至30%' },
    ],
    devices: [
      { icon: 'tv', name: { en: 'Entertainment', zh: '娱乐系统' }, value: { en: 'Cinema · On', zh: '影院 · 已开启' }, active: true },
      { icon: 'audio', name: { en: 'Spatial audio', zh: '空间音响' }, value: { en: 'Immersive', zh: '沉浸模式' }, active: true },
      { icon: 'lamp', name: { en: 'Ambient lights', zh: '氛围灯' }, value: { en: 'Warm · 30%', zh: '暖光 · 30%' }, active: true },
      { icon: 'blinds', name: { en: 'Smart shades', zh: '智能遮阳帘' }, value: { en: 'Closed', zh: '已关闭' }, active: true },
    ],
  },
  sleep: {
    key: 'sleep', name: { en: 'Sleep', zh: '睡眠' },
    kicker: { en: 'Rest easy. Renogy is watching.', zh: '安心入睡，Renogy为你守护' },
    message: { en: 'Quiet power, ideal comfort and night security work as one.', zh: '静音供电、舒适环境与夜间安防正在协同运行。' },
    ready: { en: 'Sleep mode ready', zh: '睡眠模式已就绪' },
    time: '10:36 PM', solar: '0 W', load: '238 W', batteryFlow: '-0.24 kW',
    runtime: '41 h', temperature: '24°', inverter: { en: 'Silent', zh: '静音模式' },
    security: true, sceneIcon: Moon,
    steps: [
      { en: 'Main lights turned off', zh: '主灯已关闭' },
      { en: 'Silent power enabled', zh: '静音供电已开启' },
      { en: 'Night Guard armed', zh: '夜间守护已布防' },
    ],
    devices: [
      { icon: 'lamp', name: { en: 'Ambient lights', zh: '氛围灯' }, value: { en: 'Warm · 15%', zh: '暖光 · 15%' }, active: true },
      { icon: 'humidifier', name: { en: 'Humidifier', zh: '加湿器' }, value: { en: 'Auto · 48%', zh: '自动 · 48%' }, active: true },
      { icon: 'climate', name: { en: 'Climate', zh: '空调' }, value: { en: 'Sleep · 24°C', zh: '睡眠 · 24°C' }, active: true },
      { icon: 'inverter', name: { en: 'Inverter', zh: '逆变器' }, value: { en: 'Silent', zh: '静音模式' }, active: true },
    ],
  },
};

const sceneOrder: SceneKey[] = ['camp', 'away', 'movie', 'sleep'];

const visualLoads: VisualLoad[] = [
  {
    key: 'climate', icon: Wind, name: { en: 'Climate', zh: '空调' },
    states: {
      camp: { on: true, value: { en: 'Auto · 23°C', zh: '自动 · 23°C' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Low · 22°C', zh: '低风 · 22°C' } },
      sleep: { on: true, value: { en: 'Sleep · 24°C', zh: '睡眠 · 24°C' } },
    },
  },
  {
    key: 'lights', icon: Lamp, name: { en: 'Main lights', zh: '主灯' },
    states: {
      camp: { on: true, value: { en: 'Warm · 65%', zh: '暖光 · 65%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Off', zh: '已关闭' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'shades', icon: Blinds, name: { en: 'Smart shades', zh: '智能遮阳帘' },
    states: {
      camp: { on: false, value: { en: 'Open', zh: '已打开' } },
      away: { on: true, value: { en: 'Closed', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Closed', zh: '已关闭' } },
      sleep: { on: true, value: { en: 'Closed', zh: '已关闭' } },
    },
  },
  {
    key: 'tv', icon: Tv, name: { en: 'Entertainment', zh: '影音系统' },
    states: {
      camp: { on: false, value: { en: 'Standby', zh: '待机' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Cinema', zh: '影院模式' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'humidifier', icon: Droplets, name: { en: 'Humidifier', zh: '加湿器' },
    states: {
      camp: { on: false, value: { en: 'Standby', zh: '待机' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Standby', zh: '待机' } },
      sleep: { on: true, value: { en: 'Auto · 48%', zh: '自动 · 48%' } },
    },
  },
  {
    key: 'ambient', icon: Sparkles, name: { en: 'Ambient', zh: '氛围灯' },
    states: {
      camp: { on: true, value: { en: 'Welcome · 35%', zh: '迎宾 · 35%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Cinema · 30%', zh: '影院 · 30%' } },
      sleep: { on: true, value: { en: 'Night · 15%', zh: '夜灯 · 15%' } },
    },
  },
  {
    key: 'audio', icon: Volume2, name: { en: 'Spatial audio', zh: '空间音响' },
    states: {
      camp: { on: false, value: { en: 'Standby', zh: '待机' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Immersive', zh: '沉浸模式' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'inverter', icon: Zap, name: { en: 'Inverter', zh: '逆变器' },
    states: {
      camp: { on: true, value: { en: 'Balanced', zh: '均衡模式' } },
      away: { on: true, value: { en: 'Eco', zh: '节能模式' } },
      movie: { on: true, value: { en: 'Performance', zh: '性能模式' } },
      sleep: { on: true, value: { en: 'Silent', zh: '静音模式' } },
    },
  },
  {
    key: 'lock', icon: Lock, name: { en: 'Entry lock', zh: '入户门锁' },
    states: {
      camp: { on: false, value: { en: 'Unlocked', zh: '已解锁' } },
      away: { on: true, value: { en: 'Secured', zh: '已锁定' } },
      movie: { on: false, value: { en: 'Unlocked', zh: '已解锁' } },
      sleep: { on: true, value: { en: 'Night lock', zh: '夜间锁定' } },
    },
  },
];

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const [activeScene, setActiveScene] = useState<SceneKey>('camp');
  const [pendingScene, setPendingScene] = useState<SceneKey | null>(null);
  const [intrusion, setIntrusion] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = scenes[activeScene];
  const preview = scenes[pendingScene ?? activeScene];
  const PreviewIcon = preview.sceneIcon;
  const pick = (value: Localized) => value[locale];
  const climateOn = activeScene !== 'away';
  const mainLightsOn = activeScene === 'camp';
  const ambientOn = activeScene !== 'away';
  const shadesClosed = activeScene !== 'camp';
  const cinemaOn = activeScene === 'movie';
  const humidifierOn = activeScene === 'sleep';

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const sceneStatus = intrusion
    ? (locale === 'en' ? 'Person detected at RV entrance' : '房车入口检测到人员')
    : pick(current.ready);

  function activateScene(key: SceneKey) {
    if (key === activeScene && !pendingScene) return;
    if (timer.current) clearTimeout(timer.current);
    setIntrusion(false);
    setPendingScene(key);
    timer.current = setTimeout(() => { setActiveScene(key); setPendingScene(null); }, 980);
  }

  function resetDemo() {
    if (timer.current) clearTimeout(timer.current);
    setPendingScene(null); setIntrusion(false); setActiveScene('camp');
  }

  return (
    <main className={`app-shell scene-${activeScene} ${intrusion ? 'is-alert' : ''}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/brand/renogy-logo-dark.svg" alt="Renogy" className="brand-logo" />
          <span className="brand-divider" aria-hidden="true" />
          <div><strong>ONE Vision</strong><span>{locale === 'en' ? 'Concept Experience' : '概念体验'}</span></div>
        </div>
        <div className="trip-context">
          <MapPin aria-hidden="true" /><div><span>{locale === 'en' ? 'Pine Lake · Site 07' : '松湖营地 · 07号位'}</span><small>{locale === 'en' ? 'Parked · Level complete' : '已驻车 · 调平完成'}</small></div>
        </div>
        <div className="top-actions">
          <span className="connection-pill"><Wifi aria-hidden="true" /> {locale === 'en' ? 'Connected' : '已连接'}</span>
          <time>{current.time}</time>
          <button className="icon-button language-button" onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')} aria-label={locale === 'en' ? 'Switch to Chinese' : '切换到英文'}><Languages aria-hidden="true" /><span>{locale === 'en' ? '中文' : 'EN'}</span></button>
          <button className="icon-button" onClick={resetDemo} aria-label={locale === 'en' ? 'Reset demo' : '重置演示'}><RotateCcw aria-hidden="true" /></button>
        </div>
      </header>

      <div className="dashboard">
        <div className="workspace-grid">
          <aside className="panel energy-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">{locale === 'en' ? 'ENERGY SYSTEM' : '能源系统'}</span><h2>{locale === 'en' ? 'Power flow' : '能量流'}</h2></div>
              <span className="healthy-badge"><CircleDot aria-hidden="true" /> {locale === 'en' ? 'Healthy' : '正常'}</span>
            </div>
            <div className="battery-orbit" aria-label={locale === 'en' ? 'Battery state of charge 82 percent' : '电池电量82%'}>
              <div className="battery-ring"><div><BatteryCharging aria-hidden="true" /><strong>82<span>%</span></strong><small>{locale === 'en' ? 'Battery' : '电池电量'}</small></div></div>
              <span className="orbit-dot" aria-hidden="true" />
            </div>
            <div className="energy-metrics">
              <Metric icon={Sun} label={locale === 'en' ? 'Solar' : '太阳能'} value={current.solar} tone="cyan" />
              <Metric icon={BatteryCharging} label={locale === 'en' ? 'Battery' : '电池'} value={current.batteryFlow} tone="green" />
              <Metric icon={Power} label={locale === 'en' ? 'RV load' : '房车负载'} value={current.load} tone="violet" />
            </div>
            <div className="flow-rail" aria-hidden="true"><span className="flow-line" /><span className="flow-pulse pulse-one" /><span className="flow-pulse pulse-two" /></div>
            <div className="forecast-card">
              <div className="forecast-copy"><span>{locale === 'en' ? 'Estimated autonomy' : '预计续航'}</span><strong>{current.runtime}</strong></div>
              <svg viewBox="0 0 180 58" role="img" aria-label={locale === 'en' ? 'Projected battery curve' : '预计电量曲线'}>
                <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24add3" stopOpacity=".38" /><stop offset="1" stopColor="#24add3" stopOpacity="0" /></linearGradient></defs>
                <path d="M2 49 C28 45 31 32 55 35 S84 16 108 22 S145 8 178 13 L178 58 L2 58 Z" fill="url(#chartFill)" />
                <path d="M2 49 C28 45 31 32 55 35 S84 16 108 22 S145 8 178 13" fill="none" stroke="#46c6df" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="forecast-foot"><Leaf aria-hidden="true" /> {locale === 'en' ? 'Optimized for this stay' : '已为本次驻留优化'}</div>
            </div>
          </aside>

          <section className="hero-panel">
            <img src="/assets/rv-cabin-dusk.webp" alt={locale === 'en' ? 'Modern RV cabin at Pine Lake campsite' : '停在松湖营地的现代房车内部'} className="hero-image" />
            <div className="hero-vignette" aria-hidden="true" /><div className="hero-sheen" aria-hidden="true" />
            <div className="scene-story"><span className="eyebrow">{pick(current.name).toUpperCase()} MODE</span><h1>{pick(current.kicker)}</h1><p>{pick(current.message)}</p></div>
            <div className="hero-chips">
              <span><Thermometer aria-hidden="true" /> {current.temperature}C</span>
              <span><Wind aria-hidden="true" /> {locale === 'en' ? 'Air quality excellent' : '空气质量优'}</span>
              <span><Waves aria-hidden="true" /> {locale === 'en' ? '28 dB inside' : '舱内28分贝'}</span>
            </div>
            <div className="rv-state-effects" aria-hidden="true">
              <div className={`main-light-effect ${mainLightsOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <div className={`airflow-effect ${climateOn ? 'is-running' : 'is-stopped'} airflow-${activeScene}`}><span /><span /><span /></div>
              <div className={`shade-effect ${shadesClosed ? 'is-closed' : 'is-open'}`}><span /><span /><span /><span /></div>
              <div className={`screen-effect ${cinemaOn ? 'is-running' : 'is-stopped'}`}><Film /></div>
              <div className={`audio-effect ${cinemaOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <div className={`mist-effect ${humidifierOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <div className={`ambient-effect ${ambientOn ? 'is-running ambient-${activeScene}' : 'is-stopped'}`}><span /><span /></div>
              <div className={`power-effect power-${activeScene}`}><span /><span /><span /></div>
            </div>
            <div className="vehicle-load-layer" role="list" aria-label={locale === 'en' ? 'Appliances and current states inside the RV' : '房车内负载电器及当前状态'}>
              {visualLoads.map((load, index) => {
                const LoadIcon = load.icon;
                const state = load.states[activeScene];
                return (
                  <div
                    key={`${activeScene}-${load.key}`}
                    className={`load-node load-${load.key} ${state.on ? 'is-on' : 'is-off'}`}
                    role="listitem"
                    style={{ animationDelay: `${index * 48}ms` }}
                    aria-label={`${pick(load.name)}: ${pick(state.value)}`}
                  >
                    <span className="load-node-icon"><LoadIcon aria-hidden="true" /></span>
                    <span className="load-node-copy"><strong>{pick(load.name)}</strong><small>{pick(state.value)}</small></span>
                    <span className="load-state-dot" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
            <div className="automation-card">
              <div className="automation-icon"><Sparkles aria-hidden="true" /></div>
              <div className="automation-copy"><small>{locale === 'en' ? 'RENOGY AI AUTOMATION' : 'RENOGY AI 自动化'}</small><strong>{sceneStatus}</strong></div>
              <div className="automation-steps">{current.steps.map(step => <span key={step.en}><Check aria-hidden="true" /> {pick(step)}</span>)}</div>
              <ChevronRight aria-hidden="true" className="automation-arrow" />
            </div>
            {pendingScene && (
              <div className="activation-layer" role="status" aria-live="polite">
                <div className="activation-core"><PreviewIcon aria-hidden="true" /><span>{locale === 'en' ? 'Activating' : '正在启动'}</span><strong>{pick(preview.name)} {locale === 'en' ? 'Mode' : '模式'}</strong><div className="activation-progress"><span /></div></div>
              </div>
            )}
          </section>

          <aside className="panel systems-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">{current.security ? (locale === 'en' ? 'NIGHT GUARD' : '夜间守护') : (locale === 'en' ? 'SMART LIVING' : '智能生活')}</span><h2>{current.security ? (locale === 'en' ? 'Security' : '安防') : (locale === 'en' ? 'Cabin systems' : '舱内系统')}</h2></div>
              {current.security ? <ShieldCheck className="panel-title-icon" aria-hidden="true" /> : <Armchair className="panel-title-icon" aria-hidden="true" />}
            </div>
            {current.security ? (
              <>
                <div className={`camera-feed ${intrusion ? 'camera-alert' : ''}`}>
                  <img src="/assets/exterior-camera.webp" alt={locale === 'en' ? 'Exterior camera view of the RV entrance' : '房车入口外部摄像头画面'} />
                  <div className="camera-overlay" aria-hidden="true" />
                  <div className="camera-topline"><span className={intrusion ? 'live-pill alert-pill' : 'live-pill'}><Radio aria-hidden="true" /> LIVE</span><span>CAM 01 · {current.time}</span></div>
                  {intrusion ? <div className="detection-box"><span>{locale === 'en' ? 'PERSON · 98%' : '人员 · 98%'}</span></div> : <div className="scan-beam" aria-hidden="true" />}
                  <div className="camera-caption"><Camera aria-hidden="true" /> {locale === 'en' ? 'RV entrance' : '房车入口'}</div>
                </div>
                <div className={`security-status ${intrusion ? 'security-alert' : ''}`}>
                  <div className="security-emblem">{intrusion ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</div>
                  <div><small>{locale === 'en' ? 'PERIMETER STATUS' : '周界状态'}</small><strong>{intrusion ? (locale === 'en' ? 'Motion detected' : '检测到移动') : (locale === 'en' ? 'Night Guard armed' : '夜间守护已布防')}</strong></div>
                </div>
                <div className="security-grid">
                  <SecurityItem icon={DoorClosed} label={locale === 'en' ? 'Doors' : '车门'} state={locale === 'en' ? 'Secured' : '已锁定'} alert={false} />
                  <SecurityItem icon={ScanLine} label={locale === 'en' ? 'Motion' : '移动侦测'} state={intrusion ? (locale === 'en' ? 'Detected' : '已检测') : (locale === 'en' ? 'Active' : '已开启')} alert={intrusion} />
                  <SecurityItem icon={Camera} label={locale === 'en' ? 'Recording' : '录像'} state={locale === 'en' ? 'Continuous' : '持续录像'} alert={false} />
                  <SecurityItem icon={Siren} label={locale === 'en' ? 'Siren' : '警报器'} state={intrusion ? (locale === 'en' ? 'Active' : '已响起') : (locale === 'en' ? 'Ready' : '待命')} alert={intrusion} />
                </div>
                <button className={intrusion ? 'alert-action dismiss-action' : 'alert-action'} onClick={() => setIntrusion(!intrusion)}>
                  {intrusion ? <X aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
                  {intrusion ? (locale === 'en' ? 'Resolve demo alert' : '解除演示警报') : (locale === 'en' ? 'Simulate motion' : '模拟移动入侵')}
                </button>
              </>
            ) : (
              <>
                <div className="climate-card">
                  <div><span>{locale === 'en' ? 'Interior climate' : '舱内环境'}</span><strong>{current.temperature}<small>°C</small></strong></div>
                  <div className="climate-orbit"><Wind aria-hidden="true" /><span /></div>
                  <p><Check aria-hidden="true" /> {locale === 'en' ? 'Temperature and air quality are ideal' : '温度与空气质量均处于理想状态'}</p>
                </div>
                <div className="device-list">{current.devices.map(device => {
                  const DeviceIcon = iconMap[device.icon];
                  return <div className="device-row" key={device.name.en}><span className={device.active ? 'device-icon is-on' : 'device-icon'}><DeviceIcon aria-hidden="true" /></span><div><strong>{pick(device.name)}</strong><small>{pick(device.value)}</small></div><span className={device.active ? 'device-state is-on' : 'device-state'}>{device.active ? (locale === 'en' ? 'ON' : '开') : (locale === 'en' ? 'OFF' : '关')}</span></div>;
                })}</div>
                <div className="ai-insight"><Sparkles aria-hidden="true" /><p><strong>{locale === 'en' ? 'AI insight' : 'AI建议'}</strong><span>{activeScene === 'movie' ? (locale === 'en' ? 'Enough energy for two movies and overnight climate.' : '当前电量足够观看两部电影并维持整夜空调。') : (locale === 'en' ? 'Solar surplus will restore 12% battery before sunset.' : '日落前，太阳能余量预计可补充12%电量。')}</span></p></div>
              </>
            )}
          </aside>
        </div>

        <nav className="scene-dock" aria-label={locale === 'en' ? 'RV scenes' : '房车场景'}>
          <div className="scene-intro"><span className="eyebrow">{locale === 'en' ? 'ONE-TOUCH SCENES' : '一键场景'}</span><strong>{locale === 'en' ? 'How do you want to live?' : '此刻，你想怎样生活？'}</strong></div>
          <div className="scene-buttons">{sceneOrder.map(key => {
            const scene = scenes[key]; const SceneIcon = scene.sceneIcon; const selected = (pendingScene ?? activeScene) === key;
            return <button key={key} className={selected ? 'scene-button is-selected' : 'scene-button'} onClick={() => activateScene(key)} aria-pressed={selected}><span className="scene-button-icon"><SceneIcon aria-hidden="true" /></span><span><strong>{pick(scene.name)}</strong><small>{scene.time}</small></span>{selected && <Check className="scene-check" aria-hidden="true" />}</button>;
          })}</div>
          <div className="efficiency-pill"><Gauge aria-hidden="true" /><div><strong>94%</strong><small>{locale === 'en' ? 'Energy efficiency' : '能源效率'}</small></div></div>
        </nav>
      </div>

      <div className="portrait-gate"><RotateCcw aria-hidden="true" /><h1>Renogy ONE Vision</h1><p>{locale === 'en' ? 'Rotate your iPad for the full experience.' : '请将iPad旋转至横屏以获得完整体验。'}</p></div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return <div className="metric-row"><span className={`metric-icon metric-${tone}`}><Icon aria-hidden="true" /></span><span>{label}</span><strong>{value}</strong></div>;
}

function SecurityItem({ icon: Icon, label, state, alert }: { icon: LucideIcon; label: string; state: string; alert: boolean }) {
  return <div className={alert ? 'security-item item-alert' : 'security-item'}><Icon aria-hidden="true" /><span>{label}</span><strong>{state}</strong></div>;
}
