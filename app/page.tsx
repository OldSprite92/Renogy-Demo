'use client';

import {
  Armchair, ArrowDown, ArrowLeft, ArrowUp, BatteryCharging, Blinds, Camera, Check, ChevronRight, CircleDot,
  DoorClosed, Droplets, Film, Gauge, Languages, Lamp, Leaf, Lock, MapPin, Moon,
  Power, Radio, RotateCcw, ScanLine, ShieldAlert, ShieldCheck, Siren, Snowflake,
  Sparkles, Sun, TentTree, Thermometer, Tv, Volume2, Waves, Wifi, Wind, X, Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

type Locale = 'en' | 'zh';
type SceneKey = 'camp' | 'away' | 'movie' | 'sleep';
type IconName = 'lamp' | 'climate' | 'tv' | 'audio' | 'humidifier' | 'inverter' | 'lock' | 'blinds';
type LoadKey = 'climate' | 'lights' | 'shades' | 'tv' | 'humidifier' | 'ambient' | 'audio' | 'inverter' | 'lock' | 'temperature-sensor' | 'air-sensor' | 'noise-sensor';
type Localized = { en: string; zh: string };
type DeviceState = { icon: IconName; name: Localized; value: Localized; active: boolean };
type LoadState = { on: boolean; value: Localized };
type VisualLoad = { key: LoadKey; icon: LucideIcon; name: Localized; kind?: 'load' | 'sensor'; states: Record<SceneKey, LoadState> };
type LoadOverrides = Partial<Record<SceneKey, Partial<Record<LoadKey, boolean>>>>;
type ControlValue = string | number | boolean;
type DeviceControls = Partial<Record<LoadKey, Record<string, ControlValue>>>;
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
      { icon: 'blinds', name: { en: 'Smart shades', zh: '智能遮阳帘' }, value: { en: 'Closed', zh: '已关闭' }, active: false },
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
      camp: { on: true, value: { en: 'Open', zh: '已打开' } },
      away: { on: false, value: { en: 'Closed', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Closed', zh: '已关闭' } },
      sleep: { on: false, value: { en: 'Closed', zh: '已关闭' } },
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
  {
    key: 'temperature-sensor', icon: Thermometer, kind: 'sensor', name: { en: 'Cabin temperature sensor', zh: '舱内温度传感器' },
    states: {
      camp: { on: true, value: { en: '23°C', zh: '23°C' } },
      away: { on: true, value: { en: '27°C', zh: '27°C' } },
      movie: { on: true, value: { en: '22°C', zh: '22°C' } },
      sleep: { on: true, value: { en: '24°C', zh: '24°C' } },
    },
  },
  {
    key: 'air-sensor', icon: Wind, kind: 'sensor', name: { en: 'Air quality sensor', zh: '空气质量传感器' },
    states: {
      camp: { on: true, value: { en: 'Excellent · CO₂ 620 ppm', zh: '优 · CO₂ 620 ppm' } },
      away: { on: true, value: { en: 'Excellent · CO₂ 580 ppm', zh: '优 · CO₂ 580 ppm' } },
      movie: { on: true, value: { en: 'Excellent · CO₂ 690 ppm', zh: '优 · CO₂ 690 ppm' } },
      sleep: { on: true, value: { en: 'Excellent · CO₂ 650 ppm', zh: '优 · CO₂ 650 ppm' } },
    },
  },
  {
    key: 'noise-sensor', icon: Waves, kind: 'sensor', name: { en: 'Cabin noise sensor', zh: '舱内噪声传感器' },
    states: {
      camp: { on: true, value: { en: '28 dB', zh: '28分贝' } },
      away: { on: true, value: { en: '26 dB', zh: '26分贝' } },
      movie: { on: true, value: { en: '31 dB', zh: '31分贝' } },
      sleep: { on: true, value: { en: '22 dB', zh: '22分贝' } },
    },
  },
];

const manualLoadValues: Record<LoadKey, { on: Localized; off: Localized }> = {
  climate: { on: { en: 'Manual · 24°C', zh: '手动 · 24°C' }, off: { en: 'Powered off', zh: '已关闭' } },
  lights: { on: { en: 'Warm · 65%', zh: '暖光 · 65%' }, off: { en: 'Off', zh: '已关闭' } },
  shades: { on: { en: 'Open', zh: '已打开' }, off: { en: 'Closed', zh: '已关闭' } },
  tv: { on: { en: 'Cinema', zh: '影院模式' }, off: { en: 'Off', zh: '已关闭' } },
  humidifier: { on: { en: 'Auto · 48%', zh: '自动 · 48%' }, off: { en: 'Standby', zh: '待机' } },
  ambient: { on: { en: 'Manual · 35%', zh: '手动 · 35%' }, off: { en: 'Off', zh: '已关闭' } },
  audio: { on: { en: 'Immersive', zh: '沉浸模式' }, off: { en: 'Off', zh: '已关闭' } },
  inverter: { on: { en: 'Manual power', zh: '手动供电' }, off: { en: 'Powered off', zh: '已关闭' } },
  lock: { on: { en: 'Secured', zh: '已锁定' }, off: { en: 'Unlocked', zh: '已解锁' } },
  'temperature-sensor': { on: { en: 'Online', zh: '在线' }, off: { en: 'Offline', zh: '离线' } },
  'air-sensor': { on: { en: 'Online', zh: '在线' }, off: { en: 'Offline', zh: '离线' } },
  'noise-sensor': { on: { en: 'Online', zh: '在线' }, off: { en: 'Offline', zh: '离线' } },
};

const controlLabels: Record<string, Localized> = {
  Auto: { en: 'Auto', zh: '自动' }, Cool: { en: 'Cool', zh: '制冷' }, Fan: { en: 'Fan', zh: '送风' }, Sleep: { en: 'Sleep', zh: '睡眠' },
  Low: { en: 'Low', zh: '低速' }, Medium: { en: 'Medium', zh: '中速' }, High: { en: 'High', zh: '高速' },
  Streaming: { en: 'Streaming', zh: '流媒体' }, HDMI: { en: 'HDMI', zh: 'HDMI' }, TV: { en: 'TV', zh: '电视' },
  Cinema: { en: 'Cinema', zh: '影院' }, Standard: { en: 'Standard', zh: '标准' }, Game: { en: 'Game', zh: '游戏' },
  Quiet: { en: 'Quiet', zh: '静音' }, Boost: { en: 'Boost', zh: '强力' },
  Warm: { en: 'Warm', zh: '暖光' }, Sunset: { en: 'Sunset', zh: '日落' }, Ocean: { en: 'Ocean', zh: '海洋' }, Violet: { en: 'Violet', zh: '紫罗兰' },
  Immersive: { en: 'Immersive', zh: '沉浸' }, Music: { en: 'Music', zh: '音乐' }, Night: { en: 'Night', zh: '夜间' },
  Eco: { en: 'Eco', zh: '节能' }, Balanced: { en: 'Balanced', zh: '均衡' }, Performance: { en: 'Performance', zh: '性能' }, Silent: { en: 'Silent', zh: '静音' },
  '30 sec': { en: '30 sec', zh: '30秒' }, '1 min': { en: '1 min', zh: '1分钟' }, Off: { en: 'Off', zh: '关闭' },
};

const controlTextFor = (value: string, locale: Locale) => controlLabels[value]?.[locale] ?? value;

function createSceneControls(scene: SceneKey): DeviceControls {
  const presets = {
    camp: { climateMode: 'Auto', target: 23, fan: 'Auto', main: 65, cct: 3200, shade: 100, humid: 48, ambient: 35, ambientColor: 'Warm', volume: 28, audio: 'Immersive', inverter: 'Balanced' },
    away: { climateMode: 'Auto', target: 27, fan: 'Low', main: 0, cct: 3200, shade: 0, humid: 45, ambient: 0, ambientColor: 'Warm', volume: 0, audio: 'Night', inverter: 'Eco' },
    movie: { climateMode: 'Cool', target: 22, fan: 'Low', main: 0, cct: 3000, shade: 0, humid: 48, ambient: 30, ambientColor: 'Violet', volume: 42, audio: 'Immersive', inverter: 'Performance' },
    sleep: { climateMode: 'Sleep', target: 24, fan: 'Low', main: 0, cct: 2700, shade: 0, humid: 48, ambient: 15, ambientColor: 'Warm', volume: 0, audio: 'Night', inverter: 'Silent' },
  }[scene];

  return {
    climate: { mode: presets.climateMode, target: presets.target, fan: presets.fan },
    lights: { brightness: presets.main, colorTemperature: presets.cct },
    shades: { position: presets.shade },
    tv: { source: 'Streaming', picture: scene === 'movie' ? 'Cinema' : 'Standard' },
    humidifier: { targetHumidity: presets.humid, mode: scene === 'sleep' ? 'Quiet' : 'Auto' },
    ambient: { brightness: presets.ambient, color: presets.ambientColor },
    audio: { volume: presets.volume, profile: presets.audio },
    inverter: { mode: presets.inverter, outputLimit: scene === 'away' ? 600 : 1800 },
    lock: { autoLock: scene === 'away' || scene === 'sleep' ? '30 sec' : 'Off' },
  };
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const [activeScene, setActiveScene] = useState<SceneKey>('camp');
  const [pendingScene, setPendingScene] = useState<SceneKey | null>(null);
  const [intrusion, setIntrusion] = useState(false);
  const [loadSheetOpen, setLoadSheetOpen] = useState(false);
  const [loadOverrides, setLoadOverrides] = useState<LoadOverrides>({});
  const [selectedLoadKey, setSelectedLoadKey] = useState<LoadKey | null>(null);
  const [deviceControls, setDeviceControls] = useState<DeviceControls>(() => createSceneControls('camp'));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = scenes[activeScene];
  const preview = scenes[pendingScene ?? activeScene];
  const PreviewIcon = preview.sceneIcon;
  const batteryIsCharging = !current.batteryFlow.trim().startsWith('-');
  const batteryFlowPower = current.batteryFlow.replace(/^[+-]/, '');
  const batteryFlowLabel = batteryIsCharging
    ? (locale === 'en' ? 'Charging' : '充电中')
    : (locale === 'en' ? 'Discharging' : '放电中');
  const pick = (value: Localized) => value[locale];
  const getLoadState = (load: VisualLoad, scene: SceneKey = activeScene): LoadState => {
    const override = loadOverrides[scene]?.[load.key];
    const base = typeof override !== 'boolean'
      ? load.states[scene]
      : override && load.kind === 'sensor'
        ? load.states[scene]
        : { on: override, value: manualLoadValues[load.key][override ? 'on' : 'off'] };
    if (!base.on || load.kind === 'sensor') return base;
    const controls = deviceControls[load.key] ?? {};
    const localized = (en: string, zh: string): LoadState => ({ on: true, value: { en, zh } });
    switch (load.key) {
      case 'climate': return localized(`${controlTextFor(String(controls.mode), 'en')} · ${controls.target}°C`, `${controlTextFor(String(controls.mode), 'zh')} · ${controls.target}°C`);
      case 'lights': return localized(`${Number(controls.colorTemperature) <= 3300 ? 'Warm' : Number(controls.colorTemperature) >= 5000 ? 'Cool' : 'Neutral'} · ${controls.brightness}%`, `${Number(controls.colorTemperature) <= 3300 ? '暖光' : Number(controls.colorTemperature) >= 5000 ? '冷光' : '中性光'} · ${controls.brightness}%`);
      case 'shades': return Number(controls.position) === 100 ? localized('Open', '已打开') : Number(controls.position) === 0 ? localized('Closed', '已关闭') : localized(`${controls.position}% open`, `开启${controls.position}%`);
      case 'tv': return localized(`${controlTextFor(String(controls.source), 'en')} · On`, `${controlTextFor(String(controls.source), 'zh')} · 已开启`);
      case 'humidifier': return localized(`${controlTextFor(String(controls.mode), 'en')} · ${controls.targetHumidity}%`, `${controlTextFor(String(controls.mode), 'zh')} · ${controls.targetHumidity}%`);
      case 'ambient': return localized(`${controlTextFor(String(controls.color), 'en')} · ${controls.brightness}%`, `${controlTextFor(String(controls.color), 'zh')} · ${controls.brightness}%`);
      case 'audio': return localized(`${controlTextFor(String(controls.profile), 'en')} · ${controls.volume}%`, `${controlTextFor(String(controls.profile), 'zh')} · ${controls.volume}%`);
      case 'inverter': return localized(controlTextFor(String(controls.mode), 'en'), controlTextFor(String(controls.mode), 'zh'));
      default: return base;
    }
  };
  const getLoadByKey = (key: LoadKey) => getLoadState(visualLoads.find(load => load.key === key)!);
  const cabinLoads = visualLoads.filter(load => load.kind !== 'sensor');
  const sensorDevices = visualLoads.filter(load => load.kind === 'sensor');
  const activeLoads = visualLoads.filter(load => getLoadState(load).on);
  const panelActiveLoads = activeLoads.filter(load => load.key !== 'climate');
  const climateOn = getLoadByKey('climate').on;
  const mainLightsOn = getLoadByKey('lights').on;
  const ambientOn = getLoadByKey('ambient').on;
  const shadesClosed = !getLoadByKey('shades').on;
  const tvOn = getLoadByKey('tv').on;
  const audioOn = getLoadByKey('audio').on;
  const humidifierOn = getLoadByKey('humidifier').on;
  const inverterOn = getLoadByKey('inverter').on;
  const temperatureSensor = getLoadByKey('temperature-sensor');
  const airSensor = getLoadByKey('air-sensor');
  const noiseSensor = getLoadByKey('noise-sensor');
  const onlineSensorCount = sensorDevices.filter(load => getLoadState(load).on).length;
  const temperatureReading = pick(temperatureSensor.value).replace('°C', '');
  const selectedLoad = selectedLoadKey ? visualLoads.find(load => load.key === selectedLoadKey) ?? null : null;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const sceneStatus = intrusion
    ? (locale === 'en' ? 'Person detected at RV entrance' : '房车入口检测到人员')
    : pick(current.ready);

  function activateScene(key: SceneKey) {
    if (key === activeScene && !pendingScene) return;
    if (timer.current) clearTimeout(timer.current);
    setLoadOverrides({});
    setDeviceControls(createSceneControls(key));
    setLoadSheetOpen(false);
    setSelectedLoadKey(null);
    setIntrusion(false);
    setPendingScene(key);
    timer.current = setTimeout(() => { setActiveScene(key); setPendingScene(null); }, 980);
  }

  function resetDemo() {
    if (timer.current) clearTimeout(timer.current);
    setPendingScene(null); setIntrusion(false); setActiveScene('camp'); setLoadOverrides({}); setDeviceControls(createSceneControls('camp')); setSelectedLoadKey(null); setLoadSheetOpen(false);
  }

  function toggleLoad(load: VisualLoad) {
    if (load.kind === 'sensor') return;
    const next = !getLoadState(load).on;
    setDeviceControls(previous => {
      const currentControls = previous[load.key] ?? {};
      const nextControls = { ...currentControls };
      if (load.key === 'shades') nextControls.position = next ? 100 : 0;
      if (load.key === 'lights' && next && Number(nextControls.brightness ?? 0) === 0) nextControls.brightness = 65;
      if (load.key === 'ambient' && next && Number(nextControls.brightness ?? 0) === 0) nextControls.brightness = 35;
      if (load.key === 'audio' && next && Number(nextControls.volume ?? 0) === 0) nextControls.volume = 28;
      return { ...previous, [load.key]: nextControls };
    });
    setLoadOverrides(previous => ({ ...previous, [activeScene]: { ...previous[activeScene], [load.key]: next } }));
  }

  function setLoadPower(load: VisualLoad, on: boolean) {
    if (load.kind === 'sensor') return;
    setLoadOverrides(previous => ({ ...previous, [activeScene]: { ...previous[activeScene], [load.key]: on } }));
  }

  function updateDeviceControl(key: LoadKey, field: string, value: ControlValue) {
    setDeviceControls(previous => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
    if (key === 'shades' && field === 'position') {
      const opened = Number(value) > 0;
      const load = visualLoads.find(item => item.key === key)!;
      setLoadPower(load, opened);
    }
  }

  function handleSheetOpenChange(open: boolean) {
    setLoadSheetOpen(open);
    if (!open) setSelectedLoadKey(null);
  }

  return (
    <Sheet open={loadSheetOpen} onOpenChange={handleSheetOpenChange}>
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
            <div className={`battery-orbit ${batteryIsCharging ? 'is-charging' : 'is-discharging'}`} aria-label={locale === 'en' ? `Battery state of charge 82 percent, ${batteryFlowLabel.toLowerCase()} at ${batteryFlowPower}` : `电池电量82%，${batteryFlowLabel}，功率${batteryFlowPower}`}>
              <div className="battery-ring"><div><BatteryCharging aria-hidden="true" /><strong>82<span>%</span></strong><small>{locale === 'en' ? 'Battery' : '电池电量'}</small></div></div>
              <span className="orbit-dot" aria-hidden="true" />
              <span className="battery-flow-status" role="status"><span className="battery-flow-direction">{batteryIsCharging ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}{batteryFlowLabel}</span><strong>{batteryFlowPower}</strong></span>
            </div>
            <div className="energy-metrics">
              <Metric icon={Sun} label={locale === 'en' ? 'Solar' : '太阳能'} value={current.solar} tone="cyan" />
              <Metric icon={BatteryCharging} label={locale === 'en' ? (batteryIsCharging ? 'Battery charging' : 'Battery discharge') : (batteryIsCharging ? '电池充电' : '电池放电')} value={current.batteryFlow} tone={batteryIsCharging ? 'green' : 'amber'} />
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
              <span className={temperatureSensor.on ? '' : 'is-offline'}><Thermometer aria-hidden="true" /> {temperatureSensor.on ? pick(temperatureSensor.value) : (locale === 'en' ? 'Temperature offline' : '温度传感器离线')}</span>
              <span className={airSensor.on ? '' : 'is-offline'}><Wind aria-hidden="true" /> {airSensor.on ? pick(airSensor.value) : (locale === 'en' ? 'Air sensor offline' : '空气传感器离线')}</span>
              <span className={noiseSensor.on ? '' : 'is-offline'}><Waves aria-hidden="true" /> {noiseSensor.on ? pick(noiseSensor.value) : (locale === 'en' ? 'Noise sensor offline' : '噪声传感器离线')}</span>
            </div>
            <div className="rv-state-effects" aria-hidden="true">
              <div className={`main-light-effect ${mainLightsOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <div className={`airflow-effect ${climateOn ? 'is-running' : 'is-stopped'} airflow-${activeScene}`}><span /><span /><span /></div>
              <div className={`shade-effect ${shadesClosed ? 'is-closed' : 'is-open'}`}><span /><span /><span /><span /></div>
              <div className={`screen-effect ${tvOn ? 'is-running' : 'is-stopped'}`}><Film /></div>
              <div className={`audio-effect ${audioOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <div className={`mist-effect ${humidifierOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
              <svg
                className={`ambient-effect ${ambientOn ? `is-running ambient-${activeScene}` : 'is-stopped'}`}
                viewBox="0 0 1000 620"
                preserveAspectRatio="none"
                focusable="false"
              >
                <g className="ambient-glow">
                  <path vectorEffect="non-scaling-stroke" d="M425 320 C500 310 600 310 690 323" />
                  <path vectorEffect="non-scaling-stroke" d="M92 482 C158 492 239 491 310 474" />
                  <path vectorEffect="non-scaling-stroke" d="M520 492 C618 508 734 505 820 482" />
                </g>
                <g className="ambient-segments">
                  <path vectorEffect="non-scaling-stroke" d="M425 320 C500 310 600 310 690 323" />
                  <path vectorEffect="non-scaling-stroke" d="M92 482 C158 492 239 491 310 474" />
                  <path vectorEffect="non-scaling-stroke" d="M520 492 C618 508 734 505 820 482" />
                </g>
              </svg>
              <div className={`power-effect power-${activeScene} ${inverterOn ? 'is-running' : 'is-stopped'}`}><span /><span /><span /></div>
            </div>
            <div className="vehicle-load-layer" role="list" aria-label={locale === 'en' ? 'Appliances and current states inside the RV' : '房车内负载电器及当前状态'}>
              {cabinLoads.map((load, index) => {
                const LoadIcon = load.icon;
                const state = getLoadState(load);
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
              <button className="load-sheet-trigger" onClick={() => setLoadSheetOpen(true)}><span>{locale === 'en' ? 'All devices' : '全部设备'}</span><ChevronRight aria-hidden="true" /></button>
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
                <button className="panel-loads-trigger" onClick={() => setLoadSheetOpen(true)}><Power aria-hidden="true" /><span>{locale === 'en' ? `View all ${visualLoads.length} devices` : `查看全部${visualLoads.length}项设备`}</span><ChevronRight aria-hidden="true" /></button>
              </>
            ) : (
              <>
                <div className="climate-card">
                  <div><span>{locale === 'en' ? 'Interior climate' : '舱内环境'}</span><strong>{temperatureSensor.on ? temperatureReading : '--'}<small>{temperatureSensor.on ? '°C' : (locale === 'en' ? 'OFFLINE' : '离线')}</small></strong></div>
                  <div className={`climate-orbit ${climateOn ? '' : 'is-off'}`}><Wind aria-hidden="true" /><span /></div>
                  <p>{temperatureSensor.on && airSensor.on ? <Check aria-hidden="true" /> : <Radio aria-hidden="true" />} {temperatureSensor.on && airSensor.on ? (locale === 'en' ? 'Temperature and air quality sensors are online' : '温度与空气质量传感器在线') : (locale === 'en' ? 'One or more environment sensors are offline' : '环境传感器存在离线')}</p>
                </div>
                <div className="active-load-heading"><span>{locale === 'en' ? 'Active devices' : '运行中设备'}</span><strong>{activeLoads.length}</strong></div>
                {panelActiveLoads.length ? <div className="device-list active-load-list">{panelActiveLoads.map(load => {
                  const DeviceIcon = load.icon;
                  const state = getLoadState(load);
                  return <div className="device-row" key={load.key}><span className="device-icon is-on"><DeviceIcon aria-hidden="true" /></span><div><strong>{pick(load.name)}</strong><small>{pick(state.value)}</small></div><span className="device-state is-on">{locale === 'en' ? 'ON' : '开'}</span></div>;
                })}</div> : activeLoads.length === 0 ? <div className="loads-empty"><Power aria-hidden="true" /><span>{locale === 'en' ? 'All cabin devices are offline' : '所有舱内设备均已离线'}</span></div> : null}
                <button className="panel-loads-trigger" onClick={() => setLoadSheetOpen(true)}><Power aria-hidden="true" /><span>{locale === 'en' ? `View all ${visualLoads.length} devices` : `查看全部${visualLoads.length}项设备`}</span><ChevronRight aria-hidden="true" /></button>
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
      <SheetContent side="bottom" showCloseButton={false} className="load-sheet">
        <div className="sheet-grabber" aria-hidden="true" />
        <SheetHeader className="load-sheet-header">
          <div>
            {selectedLoad && <button className="sheet-back-button" type="button" onClick={() => setSelectedLoadKey(null)}><ArrowLeft aria-hidden="true" />{locale === 'en' ? 'All devices' : '全部设备'}</button>}
            <span className="eyebrow">{selectedLoad ? (selectedLoad.kind === 'sensor' ? (locale === 'en' ? 'LIVE MONITORING' : '实时监测') : (locale === 'en' ? 'DEVICE CONTROL' : '设备控制')) : (locale === 'en' ? 'LIVE SCENE STATUS' : '当前场景状态')}</span>
            <SheetTitle>{selectedLoad ? pick(selectedLoad.name) : <>{pick(current.name)} {locale === 'en' ? 'Mode · All devices' : '模式 · 全部设备'}</>}</SheetTitle>
            <SheetDescription>{selectedLoad ? (selectedLoad.kind === 'sensor' ? (locale === 'en' ? 'Always-on sensing device · Read-only monitoring' : '常驻感知设备 · 仅支持查看监测数据') : (locale === 'en' ? 'Adjust this device without leaving the current scene' : '调整设备后将立即回写当前场景')) : (locale === 'en' ? `${cabinLoads.length} loads · ${onlineSensorCount}/${sensorDevices.length} sensors online · Select a device for controls` : `${cabinLoads.length}项负载 · ${onlineSensorCount}/${sensorDevices.length}个传感器在线 · 选择设备进入专属控制`)}</SheetDescription>
          </div>
          <SheetClose className="sheet-close-button" aria-label={locale === 'en' ? 'Close device status' : '关闭设备状态'}><X aria-hidden="true" /></SheetClose>
        </SheetHeader>
        {selectedLoad ? (
          <DeviceControlPanel
            device={selectedLoad}
            state={getLoadState(selectedLoad)}
            controls={deviceControls[selectedLoad.key] ?? {}}
            locale={locale}
            onToggle={() => toggleLoad(selectedLoad)}
            onPower={on => setLoadPower(selectedLoad, on)}
            onUpdate={(field, value) => updateDeviceControl(selectedLoad.key, field, value)}
          />
        ) : (
          <div className="sheet-load-grid" aria-label={locale === 'en' ? 'All RV device controls' : '全部房车设备控制'}>
            {visualLoads.map(load => {
              const LoadIcon = load.icon;
              const state = getLoadState(load);
              const quickStateLabel = load.key === 'shades'
                ? (state.on ? (locale === 'en' ? 'OPEN' : '开') : (locale === 'en' ? 'CLOSED' : '合'))
                : load.key === 'lock'
                  ? (state.on ? (locale === 'en' ? 'LOCKED' : '已锁') : (locale === 'en' ? 'UNLOCKED' : '未锁'))
                  : (state.on ? (locale === 'en' ? 'ON' : '开') : (locale === 'en' ? 'OFF' : '关'));
              return (
                <div className={`sheet-load-card ${load.kind === 'sensor' ? 'is-sensor' : ''} ${state.on ? 'is-on' : 'is-off'}`} key={load.key}>
                  <button className="sheet-card-detail" type="button" onClick={() => setSelectedLoadKey(load.key)} aria-label={`${pick(load.name)} · ${pick(state.value)} · ${locale === 'en' ? 'Open controls' : '打开控制面板'}`}>
                    <span className="sheet-load-icon"><LoadIcon aria-hidden="true" /></span>
                    <span className="sheet-load-copy"><strong>{pick(load.name)}</strong><small>{pick(state.value)}</small></span>
                    <ChevronRight className="sheet-card-chevron" aria-hidden="true" />
                  </button>
                  {load.kind === 'sensor' ? (
                    <span className="sheet-state-badge">{locale === 'en' ? 'MONITORING' : '监测中'}</span>
                  ) : (
                    <div className="sheet-quick-control">
                      <span aria-hidden="true">{quickStateLabel}</span>
                      <Switch
                        className="card-quick-switch"
                        checked={state.on}
                        onCheckedChange={() => toggleLoad(load)}
                        aria-label={`${locale === 'en' ? 'Quick control' : '快捷控制'} · ${pick(load.name)} · ${quickStateLabel}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </main>
    </Sheet>
  );
}

function DeviceControlPanel({ device, state, controls, locale, onToggle, onPower, onUpdate }: {
  device: VisualLoad;
  state: LoadState;
  controls: Record<string, ControlValue>;
  locale: Locale;
  onToggle: () => void;
  onPower: (on: boolean) => void;
  onUpdate: (field: string, value: ControlValue) => void;
}) {
  const t = (en: string, zh: string) => locale === 'en' ? en : zh;
  const numberValue = (field: string, fallback: number) => Number(controls[field] ?? fallback);
  const stringValue = (field: string, fallback: string) => String(controls[field] ?? fallback);
  const DeviceIcon = device.icon;

  if (device.kind === 'sensor') {
    const sensorMetrics = device.key === 'temperature-sensor' ? [
      [t('Current reading', '当前温度'), state.value[locale]],
      [t('Accuracy', '测量精度'), '±0.3°C'],
      [t('Sampling', '采样周期'), t('Every 5 sec', '每5秒')],
      [t('Installed at', '安装位置'), t('Cabin ceiling', '舱内顶部')],
    ] : device.key === 'air-sensor' ? [
      ['CO₂', state.value[locale].match(/CO₂\s[\d]+\sppm/)?.[0].replace('CO₂ ', '') ?? '650 ppm'],
      ['TVOC', '0.18 mg/m³'],
      ['PM2.5', '8 μg/m³'],
      [t('Sampling', '采样周期'), t('Every 10 sec', '每10秒')],
    ] : [
      [t('Current level', '当前噪声'), state.value[locale]],
      [t('15 min average', '15分钟平均'), '25 dB'],
      [t('Peak', '峰值'), '38 dB'],
      [t('Privacy', '隐私模式'), t('No audio stored', '不保存录音')],
    ];
    return (
      <section className="device-control-panel sensor-monitor" aria-label={`${device.name[locale]} ${t('monitoring details', '监测详情')}`}>
        <div className="device-control-summary">
          <span className="device-control-icon"><DeviceIcon aria-hidden="true" /></span>
          <div><small>{t('SYSTEM MANAGED', '系统托管')}</small><strong>{state.value[locale]}</strong><span>{t('Online · Continuous monitoring', '在线 · 持续监测')}</span></div>
          <span className="monitoring-badge"><Radio aria-hidden="true" />{t('MONITORING', '监测中')}</span>
        </div>
        <div className="sensor-metric-grid">
          {sensorMetrics.map(([label, value]) => <div className="sensor-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <div className="sensor-readonly-note"><ShieldCheck aria-hidden="true" /><span><strong>{t('Always-on sensing', '常驻感知')}</strong>{t('This sensor cannot be switched off from a scene. Maintenance and calibration are managed at system level.', '传感器不支持在场景中关闭，维护与校准由系统级统一管理。')}</span></div>
      </section>
    );
  }

  const controlBody = (() => {
    switch (device.key) {
      case 'climate':
        return <><SegmentedControl label={t('Operating mode', '运行模式')} options={['Auto', 'Cool', 'Fan', 'Sleep']} value={stringValue('mode', 'Auto')} locale={locale} onChange={value => onUpdate('mode', value)} /><RangeControl label={t('Target temperature', '目标温度')} value={numberValue('target', 23)} min={16} max={30} unit="°C" onChange={value => onUpdate('target', value)} /><SegmentedControl label={t('Fan speed', '风速')} options={['Auto', 'Low', 'Medium', 'High']} value={stringValue('fan', 'Auto')} locale={locale} onChange={value => onUpdate('fan', value)} /></>;
      case 'lights':
        return <><RangeControl label={t('Brightness', '亮度')} value={numberValue('brightness', 65)} min={1} max={100} unit="%" onChange={value => onUpdate('brightness', value)} /><RangeControl label={t('Color temperature', '色温')} value={numberValue('colorTemperature', 3200)} min={2700} max={6500} step={100} unit="K" onChange={value => onUpdate('colorTemperature', value)} gradient="temperature" /></>;
      case 'shades':
        return <><div className="control-group"><span className="control-label">{t('Quick position', '快捷位置')}</span><div className="control-actions"><button className={numberValue('position', 0) === 100 ? 'is-selected' : ''} type="button" onClick={() => { onPower(true); onUpdate('position', 100); }}>{t('Open', '全开')}</button><button className={numberValue('position', 0) === 50 ? 'is-selected' : ''} type="button" onClick={() => { onPower(true); onUpdate('position', 50); }}>{t('Half', '半开')}</button><button className={numberValue('position', 0) === 0 ? 'is-selected' : ''} type="button" onClick={() => { onPower(false); onUpdate('position', 0); }}>{t('Close', '关闭')}</button></div></div><RangeControl label={t('Opening position', '开启位置')} value={numberValue('position', 0)} min={0} max={100} unit="%" onChange={value => onUpdate('position', value)} /></>;
      case 'tv':
        return <><SegmentedControl label={t('Input source', '输入源')} options={['Streaming', 'HDMI', 'TV']} value={stringValue('source', 'Streaming')} locale={locale} onChange={value => onUpdate('source', value)} /><SegmentedControl label={t('Picture preset', '画面模式')} options={['Cinema', 'Standard', 'Game']} value={stringValue('picture', 'Standard')} locale={locale} onChange={value => onUpdate('picture', value)} /></>;
      case 'humidifier':
        return <><RangeControl label={t('Target humidity', '目标湿度')} value={numberValue('targetHumidity', 48)} min={35} max={70} unit="%" onChange={value => onUpdate('targetHumidity', value)} /><SegmentedControl label={t('Humidification mode', '加湿模式')} options={['Auto', 'Quiet', 'Boost']} value={stringValue('mode', 'Auto')} locale={locale} onChange={value => onUpdate('mode', value)} /></>;
      case 'ambient': {
        const colors = [{ key: 'Warm', hex: '#ffc680' }, { key: 'Sunset', hex: '#ff8d68' }, { key: 'Ocean', hex: '#62d5e8' }, { key: 'Violet', hex: '#a78bfa' }];
        return <><RangeControl label={t('Brightness', '亮度')} value={numberValue('brightness', 35)} min={1} max={100} unit="%" onChange={value => onUpdate('brightness', value)} /><div className="control-group"><span className="control-label">{t('Light color', '灯光颜色')}</span><div className="color-presets">{colors.map(color => <button type="button" key={color.key} className={stringValue('color', 'Warm') === color.key ? 'is-selected' : ''} aria-pressed={stringValue('color', 'Warm') === color.key} onClick={() => onUpdate('color', color.key)}><span style={{ background: color.hex }} />{controlTextFor(color.key, locale)}</button>)}</div></div></>;
      }
      case 'audio':
        return <><RangeControl label={t('Volume', '音量')} value={numberValue('volume', 28)} min={0} max={100} unit="%" onChange={value => onUpdate('volume', value)} /><SegmentedControl label={t('Sound profile', '声场模式')} options={['Immersive', 'Music', 'Night']} value={stringValue('profile', 'Immersive')} locale={locale} onChange={value => onUpdate('profile', value)} /></>;
      case 'inverter':
        return <><SegmentedControl label={t('Power strategy', '供电策略')} options={['Eco', 'Balanced', 'Performance', 'Silent']} value={stringValue('mode', 'Balanced')} locale={locale} onChange={value => onUpdate('mode', value)} /><RangeControl label={t('AC output limit', 'AC输出上限')} value={numberValue('outputLimit', 1800)} min={300} max={3000} step={100} unit="W" onChange={value => onUpdate('outputLimit', value)} /></>;
      case 'lock':
        return <><div className="control-group"><span className="control-label">{t('Door status', '门锁状态')}</span><div className="control-actions two-up"><button className={state.on ? 'is-selected' : ''} type="button" onClick={() => onPower(true)}><Lock aria-hidden="true" />{t('Lock', '上锁')}</button><button className={!state.on ? 'is-selected' : ''} type="button" onClick={() => onPower(false)}><DoorClosed aria-hidden="true" />{t('Unlock', '解锁')}</button></div></div><SegmentedControl label={t('Auto-lock delay', '自动上锁延时')} options={['30 sec', '1 min', 'Off']} value={stringValue('autoLock', 'Off')} locale={locale} onChange={value => onUpdate('autoLock', value)} /></>;
      default:
        return <div className="control-empty">{t('No additional controls', '暂无更多控制项')}</div>;
    }
  })();

  const hidesPower = device.key === 'shades' || device.key === 'lock';
  return (
    <section className="device-control-panel" aria-label={`${device.name[locale]} ${t('controls', '控制')}`}>
      <div className="device-control-summary">
        <span className="device-control-icon"><DeviceIcon aria-hidden="true" /></span>
        <div><small>{t('CURRENT STATE', '当前状态')}</small><strong aria-live="polite">{state.value[locale]}</strong><span>{t('Changes apply immediately to this scene', '修改将立即应用到当前场景')}</span></div>
        {!hidesPower && <button className={`device-power-button ${state.on ? 'is-on' : ''}`} type="button" aria-pressed={state.on} onClick={onToggle}><Power aria-hidden="true" />{state.on ? t('Turn off', '关闭') : t('Turn on', '开启')}</button>}
      </div>
      <div className={`device-control-fields ${state.on || hidesPower ? '' : 'is-disabled'}`}>{controlBody}</div>
    </section>
  );
}

function SegmentedControl({ label, options, value, locale, onChange }: { label: string; options: string[]; value: string; locale: Locale; onChange: (value: string) => void }) {
  return <div className="control-group"><span className="control-label">{label}</span><div className="segmented-control">{options.map(option => <button type="button" key={option} className={value === option ? 'is-selected' : ''} aria-pressed={value === option} onClick={() => onChange(option)}>{controlTextFor(option, locale)}</button>)}</div></div>;
}

function RangeControl({ label, value, min, max, step = 1, unit, gradient, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; gradient?: 'temperature'; onChange: (value: number) => void }) {
  return <label className="range-control"><span className="control-label">{label}<strong>{value}{unit}</strong></span><input className={gradient === 'temperature' ? 'temperature-range' : ''} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /><span className="range-bounds"><small>{min}{unit}</small><small>{max}{unit}</small></span></label>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return <div className="metric-row"><span className={`metric-icon metric-${tone}`}><Icon aria-hidden="true" /></span><span>{label}</span><strong>{value}</strong></div>;
}

function SecurityItem({ icon: Icon, label, state, alert }: { icon: LucideIcon; label: string; state: string; alert: boolean }) {
  return <div className={alert ? 'security-item item-alert' : 'security-item'}><Icon aria-hidden="true" /><span>{label}</span><strong>{state}</strong></div>;
}
