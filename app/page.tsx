'use client';

import {
  Armchair,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Battery,
  BatteryCharging,
  Blinds,
  Camera,
  Check,
  ChevronRight,
  CircleDot,
  Coffee,
  CookingPot,
  DoorClosed,
  Droplets,
  Film,
  Gauge,
  Hand,
  History,
  Languages,
  Lamp,
  Leaf,
  Lock,
  MapPin,
  Maximize2,
  Microwave,
  Moon,
  Power,
  Radar,
  Radio,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Snowflake,
  Sparkles,
  Sun,
  TentTree,
  Thermometer,
  Tv,
  Volume2,
  Waves,
  Wifi,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

type Locale = 'en' | 'zh';
type SceneKey = 'camp' | 'away' | 'movie' | 'sleep';
type SecurityView = 'exterior' | 'interior';
type HealthCheckPhase = 'idle' | 'scanning' | 'complete';
type HealthLevel = 'excellent' | 'improve' | 'urgent';
type HealthDiagnostic = {
  id: string;
  name: Localized;
  level: HealthLevel;
  score: number;
  device: Localized;
  observed: Localized;
  impact: Localized;
  recommendation: Localized;
};
type IconName =
  | 'lamp'
  | 'climate'
  | 'tv'
  | 'audio'
  | 'humidifier'
  | 'inverter'
  | 'lock'
  | 'blinds';
type LoadKey =
  | 'climate'
  | 'lights'
  | 'coffee'
  | 'shades'
  | 'tv'
  | 'camera'
  | 'sentry-camera'
  | 'microwave'
  | 'induction'
  | 'humidifier'
  | 'ambient'
  | 'audio'
  | 'inverter'
  | 'lock'
  | 'temperature-sensor'
  | 'air-sensor'
  | 'noise-sensor';
type Localized = { en: string; zh: string };
type DeviceState = {
  icon: IconName;
  name: Localized;
  value: Localized;
  active: boolean;
};
type LoadState = { on: boolean; value: Localized };
type VisualLoad = {
  key: LoadKey;
  icon: LucideIcon;
  name: Localized;
  kind?: 'load' | 'sensor';
  states: Record<SceneKey, LoadState>;
};
type LoadOverrides = Partial<
  Record<SceneKey, Partial<Record<LoadKey, boolean>>>
>;
type ControlValue = string | number | boolean;
type DeviceControls = Partial<Record<LoadKey, Record<string, ControlValue>>>;
type DeviceLogAction = {
  device: Localized;
  detail: Localized;
};
type DeviceLogEntry = {
  id: number;
  sourceKey: string;
  device: Localized;
  detail: Localized;
  time: string;
  actions?: DeviceLogAction[];
};
type Scene = {
  key: SceneKey;
  name: Localized;
  kicker: Localized;
  message: Localized;
  ready: Localized;
  time: string;
  solar: string;
  load: string;
  batteryFlow: string;
  runtime: string;
  temperature: string;
  inverter: Localized;
  security: boolean;
  sceneIcon: LucideIcon;
  steps: Localized[];
  devices: DeviceState[];
};

const iconMap: Record<IconName, LucideIcon> = {
  lamp: Lamp,
  climate: Snowflake,
  tv: Tv,
  audio: Volume2,
  humidifier: Droplets,
  inverter: Zap,
  lock: Lock,
  blinds: Blinds,
};

const sentryCameras = [
  {
    id: '01',
    position: 'front',
    scope: 'exterior',
    label: { en: 'Front', zh: '车头' },
    detectsIntrusion: false,
  },
  {
    id: '02',
    position: 'entry',
    scope: 'exterior',
    label: { en: 'Rear', zh: '车尾' },
    detectsIntrusion: true,
  },
  {
    id: '03',
    position: 'rear',
    scope: 'exterior',
    label: { en: 'Left side', zh: '左侧' },
    detectsIntrusion: false,
  },
  {
    id: '04',
    position: 'camp',
    scope: 'exterior',
    label: { en: 'Right side', zh: '右侧' },
    detectsIntrusion: false,
  },
] as const;

const indoorCamera = {
  id: '05',
  position: 'interior',
  scope: 'interior',
  label: { en: 'Cabin overview', zh: '车内全景' },
  detectsIntrusion: false,
} as const;

const securityCameras = [...sentryCameras, indoorCamera] as const;

const initialDeviceLogs: DeviceLogEntry[] = [
  {
    id: 3,
    sourceKey: 'initial-lights',
    device: { en: 'Lights', zh: '灯' },
    detail: { en: 'Brightness 100%', zh: '亮度 100%' },
    time: '18:42',
  },
  {
    id: 2,
    sourceKey: 'initial-climate',
    device: { en: 'Air conditioner', zh: '空调' },
    detail: { en: 'Auto · 23°C', zh: '自动 · 23°C' },
    time: '18:42',
  },
  {
    id: 1,
    sourceKey: 'initial-camera',
    device: { en: 'Cabin camera', zh: '车内摄像头' },
    detail: { en: 'Privacy mode', zh: '隐私模式' },
    time: '18:42',
  },
];

function toLogTime(sceneTime: string) {
  const match = sceneTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return sceneTime;
  const [, rawHour, minute, period] = match;
  let hour = Number(rawHour) % 12;
  if (period.toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function formatSceneTime(sceneTime: string, locale: Locale) {
  return locale === 'zh' ? toLogTime(sceneTime) : sceneTime;
}

const scenes: Record<SceneKey, Scene> = {
  camp: {
    key: 'camp',
    name: { en: 'Camp', zh: '驻车' },
    kicker: { en: 'Welcome to Pine Lake', zh: '欢迎抵达松湖营地' },
    message: {
      en: 'Your RV is level, connected and ready to enjoy.',
      zh: '房车已调平、连接完成，可以开始享受营地生活。',
    },
    ready: { en: 'Camp setup complete', zh: '驻车设置已完成' },
    time: '6:42 PM',
    solar: '1.42 kW',
    load: '420 W',
    batteryFlow: '+0.86 kW',
    runtime: '38 h',
    temperature: '23°',
    inverter: { en: 'Balanced', zh: '均衡模式' },
    security: false,
    sceneIcon: TentTree,
    steps: [
      { en: 'Auto-level complete', zh: '自动调平完成' },
      { en: 'Awning deployed', zh: '遮阳棚已展开' },
      { en: 'Kitchen appliances ready', zh: '厨房电器已就绪' },
    ],
    devices: [
      {
        icon: 'lamp',
        name: { en: 'Welcome lights', zh: '迎宾灯' },
        value: { en: 'Warm · 65%', zh: '暖光 · 65%' },
        active: true,
      },
      {
        icon: 'climate',
        name: { en: 'Air conditioner', zh: '空调' },
        value: { en: 'Auto · 23°C', zh: '自动 · 23°C' },
        active: true,
      },
      {
        icon: 'humidifier',
        name: { en: 'Humidifier', zh: '加湿器' },
        value: { en: 'Auto · 48%', zh: '自动 · 48%' },
        active: true,
      },
      {
        icon: 'inverter',
        name: { en: 'Inverter', zh: '逆变器' },
        value: { en: 'Balanced', zh: '均衡模式' },
        active: true,
      },
    ],
  },
  away: {
    key: 'away',
    name: { en: 'Away', zh: '外出' },
    kicker: { en: 'Explore with peace of mind', zh: '放心离开，安心探索' },
    message: {
      en: 'Protection is active while solar restores your range.',
      zh: '安防系统已布防，太阳能正在补充续航。',
    },
    ready: { en: 'Away mode secured', zh: '外出模式已布防' },
    time: '10:18 AM',
    solar: '1.42 kW',
    load: '96 W',
    batteryFlow: '+1.18 kW',
    runtime: '72 h+',
    temperature: '27°',
    inverter: { en: 'Eco', zh: '节能模式' },
    security: true,
    sceneIcon: ShieldCheck,
    steps: [
      {
        en: 'Air conditioning and cooking loads off',
        zh: '空调及烹饪负载已关闭',
      },
      { en: 'Doors and windows secured', zh: '门窗已锁定' },
      { en: 'Cameras and solar priority on', zh: '摄像头与太阳能优先已开启' },
    ],
    devices: [
      {
        icon: 'lock',
        name: { en: 'Smart lock', zh: '智能门锁' },
        value: { en: 'Locked', zh: '已上锁' },
        active: true,
      },
      {
        icon: 'lamp',
        name: { en: 'Cabin lights', zh: '舱内灯光' },
        value: { en: 'Off', zh: '已关闭' },
        active: false,
      },
      {
        icon: 'climate',
        name: { en: 'Air conditioner', zh: '空调' },
        value: { en: 'Powered off', zh: '已关闭' },
        active: false,
      },
      {
        icon: 'inverter',
        name: { en: 'Inverter', zh: '逆变器' },
        value: { en: 'Eco', zh: '节能模式' },
        active: true,
      },
    ],
  },
  movie: {
    key: 'movie',
    name: { en: 'Movie', zh: '观影' },
    kicker: { en: 'Your private cinema is ready', zh: '你的私人影院已就绪' },
    message: {
      en: 'Lighting, sound and temperature are tuned for the moment.',
      zh: '灯光、声音与温度均已调整至最佳观影状态。',
    },
    ready: { en: 'Cinema atmosphere ready', zh: '影院氛围已就绪' },
    time: '8:12 PM',
    solar: '0.18 kW',
    load: '896 W',
    batteryFlow: '-0.71 kW',
    runtime: '17 h',
    temperature: '22°',
    inverter: { en: 'Performance', zh: '性能模式' },
    security: false,
    sceneIcon: Film,
    steps: [
      { en: 'Smart shades closed', zh: '智能遮阳帘已关闭' },
      { en: 'Cinema audio enabled', zh: '影院音响已开启' },
      { en: 'Popcorn preset ready', zh: '爆米花预设已就绪' },
    ],
    devices: [
      {
        icon: 'tv',
        name: { en: 'Entertainment system', zh: '影音系统' },
        value: { en: 'Cinema · On', zh: '影院 · 已开启' },
        active: true,
      },
      {
        icon: 'audio',
        name: { en: 'Spatial audio', zh: '空间音响' },
        value: { en: 'Immersive', zh: '沉浸模式' },
        active: true,
      },
      {
        icon: 'lamp',
        name: { en: 'Ambient lights', zh: '氛围灯' },
        value: { en: 'Warm · 30%', zh: '暖光 · 30%' },
        active: true,
      },
      {
        icon: 'blinds',
        name: { en: 'Smart shades', zh: '智能遮阳帘' },
        value: { en: 'Closed', zh: '已关闭' },
        active: false,
      },
    ],
  },
  sleep: {
    key: 'sleep',
    name: { en: 'Sleep', zh: '睡眠' },
    kicker: {
      en: 'Rest easy. Renogy is watching.',
      zh: '安心入睡，Renogy为你守护',
    },
    message: {
      en: 'Quiet power, ideal comfort and night security work as one.',
      zh: '静音供电、舒适环境与夜间安防正在协同运行。',
    },
    ready: { en: 'Sleep mode ready', zh: '睡眠模式已就绪' },
    time: '10:36 PM',
    solar: '0 W',
    load: '238 W',
    batteryFlow: '-0.24 kW',
    runtime: '41 h',
    temperature: '24°',
    inverter: { en: 'Silent', zh: '静音模式' },
    security: true,
    sceneIcon: Moon,
    steps: [
      { en: 'Lights and cooking loads off', zh: '灯光及烹饪负载已关闭' },
      { en: 'Silent power enabled', zh: '静音供电已开启' },
      { en: 'Night Guard armed', zh: '夜间守护已布防' },
    ],
    devices: [
      {
        icon: 'lamp',
        name: { en: 'Ambient lights', zh: '氛围灯' },
        value: { en: 'Warm · 15%', zh: '暖光 · 15%' },
        active: true,
      },
      {
        icon: 'humidifier',
        name: { en: 'Humidifier', zh: '加湿器' },
        value: { en: 'Auto · 48%', zh: '自动 · 48%' },
        active: true,
      },
      {
        icon: 'climate',
        name: { en: 'Air conditioner', zh: '空调' },
        value: { en: 'Sleep · 24°C', zh: '睡眠 · 24°C' },
        active: true,
      },
      {
        icon: 'inverter',
        name: { en: 'Inverter', zh: '逆变器' },
        value: { en: 'Silent', zh: '静音模式' },
        active: true,
      },
    ],
  },
};

const sceneOrder: SceneKey[] = ['camp', 'away', 'movie', 'sleep'];

const systemHealthChecks: Localized[] = [
  { en: 'Power supply and energy storage', zh: '供电与储能' },
  { en: 'Load scheduling', zh: '负载调度' },
  { en: 'Standby power management', zh: '待机能耗管理' },
  { en: 'Power conversion', zh: '电能转换' },
  { en: 'Scene automation', zh: '场景联动' },
];

function getHealthLevel(score: number): HealthLevel {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'improve';
  return 'urgent';
}

function getHealthTitle(level: HealthLevel): Localized {
  if (level === 'excellent') {
    return {
      en: 'Your energy system is in excellent condition',
      zh: '当前系统能源配置优秀',
    };
  }
  if (level === 'improve') {
    return {
      en: 'Your energy system can be improved',
      zh: '当前系统能源配置有待提高',
    };
  }
  return {
    en: 'Energy issues require immediate attention',
    zh: '发现需要立即解决的能源问题',
  };
}

const energyInsights: Record<
  SceneKey,
  {
    score: number;
    grade: Localized;
    summary: Localized;
    explanation: Localized;
    opportunity: Localized;
    actions: Localized[];
    factors: { name: Localized; weight: number; score: number }[];
  }
> = {
  camp: {
    score: 91,
    grade: { en: 'Excellent', zh: '优秀' },
    summary: {
      en: 'Comfort and charging are well balanced',
      zh: '舒适体验与充电效率保持均衡',
    },
    explanation: {
      en: 'Strong solar input covers the active cabin loads and still leaves surplus energy for the battery.',
      zh: '太阳能输入能够覆盖当前舱内负载，并保留余量为电池充电。',
    },
    opportunity: {
      en: 'Run high-power cooking while solar input is strongest to protect battery range.',
      zh: '建议在太阳能输入最强时使用高功率烹饪设备，以保护电池续航。',
    },
    actions: [
      {
        en: 'Solar surplus is charging the battery',
        zh: '太阳能余量正在为电池充电',
      },
      {
        en: 'Kitchen appliances await manual start',
        zh: '厨房电器等待手动启动',
      },
      { en: 'Inverter uses Balanced mode', zh: '逆变器运行于均衡模式' },
    ],
    factors: [
      {
        name: { en: 'Load scheduling', zh: '负载调度' },
        weight: 35,
        score: 92,
      },
      {
        name: { en: 'Standby power management', zh: '待机能耗管理' },
        weight: 25,
        score: 88,
      },
      {
        name: { en: 'Power conversion', zh: '电能转换' },
        weight: 25,
        score: 94,
      },
      {
        name: { en: 'Renewable energy use', zh: '可再生能源利用' },
        weight: 15,
        score: 88,
      },
    ],
  },
  away: {
    score: 97,
    grade: { en: 'Optimal', zh: '卓越' },
    summary: {
      en: 'Only protection and essential systems remain active',
      zh: '仅保留安防和必要系统运行',
    },
    explanation: {
      en: 'Comfort loads are suspended while solar generation is prioritized for battery recovery.',
      zh: '舒适类负载已暂停，太阳能优先用于补充电池续航。',
    },
    opportunity: {
      en: 'This scene is already near its practical efficiency limit.',
      zh: '该场景已接近当前配置下的最佳能效。',
    },
    actions: [
      {
        en: 'Power to cooking appliances is safely disconnected',
        zh: '烹饪设备已安全断电',
      },
      { en: 'Solar charging is prioritized', zh: '已优先进行太阳能充电' },
      { en: 'Inverter is in Eco mode', zh: '逆变器已进入节能模式' },
    ],
    factors: [
      {
        name: { en: 'Load scheduling', zh: '负载调度' },
        weight: 35,
        score: 99,
      },
      {
        name: { en: 'Standby power management', zh: '待机能耗管理' },
        weight: 25,
        score: 98,
      },
      {
        name: { en: 'Power conversion', zh: '电能转换' },
        weight: 25,
        score: 94,
      },
      {
        name: { en: 'Renewable energy use', zh: '可再生能源利用' },
        weight: 15,
        score: 96,
      },
    ],
  },
  movie: {
    score: 86,
    grade: { en: 'Good', zh: '良好' },
    summary: {
      en: 'Immersive comfort uses more available energy',
      zh: '沉浸体验正在使用更多可用能源',
    },
    explanation: {
      en: 'The entertainment system, spatial audio and Performance power mode are active while solar input is limited.',
      zh: '影音、空间音响和性能供电同时运行，且当前太阳能输入有限。',
    },
    opportunity: {
      en: 'Returning the inverter to Balanced mode after the movie could recover 5 points.',
      zh: '观影结束后将逆变器恢复至均衡模式，预计可提升5分。',
    },
    actions: [
      {
        en: 'Microwave popcorn preset awaits confirmation',
        zh: '微波炉爆米花预设等待手动确认',
      },
      { en: 'Ambient lighting is limited to 30%', zh: '氛围灯限制在30%' },
      {
        en: 'Cooking never auto-starts from a scene',
        zh: '场景不会自动启动烹饪',
      },
    ],
    factors: [
      {
        name: { en: 'Load scheduling', zh: '负载调度' },
        weight: 35,
        score: 84,
      },
      {
        name: { en: 'Standby power management', zh: '待机能耗管理' },
        weight: 25,
        score: 85,
      },
      {
        name: { en: 'Power conversion', zh: '电能转换' },
        weight: 25,
        score: 92,
      },
      {
        name: { en: 'Renewable energy use', zh: '可再生能源利用' },
        weight: 15,
        score: 82,
      },
    ],
  },
  sleep: {
    score: 94,
    grade: { en: 'Excellent', zh: '优秀' },
    summary: {
      en: 'Quiet comfort runs with tightly managed power',
      zh: '静音舒适体验正在精细控制能耗',
    },
    explanation: {
      en: 'Lighting and entertainment loads are off while climate, humidity and security run in low-power modes.',
      zh: '照明与影音负载已关闭，空调、加湿和安防以低功耗模式运行。',
    },
    opportunity: {
      en: 'Raising the climate target by 1°C could add another 2 points.',
      zh: '将空调目标温度提高1°C，预计还可提升2分。',
    },
    actions: [
      {
        en: 'All cooking appliances are locked in the off state',
        zh: '全部烹饪设备已锁定关闭',
      },
      { en: 'Inverter uses Silent mode', zh: '逆变器运行于静音模式' },
      {
        en: 'Night comfort loads are coordinated',
        zh: '夜间舒适负载已协同调度',
      },
    ],
    factors: [
      {
        name: { en: 'Load scheduling', zh: '负载调度' },
        weight: 35,
        score: 96,
      },
      {
        name: { en: 'Standby power management', zh: '待机能耗管理' },
        weight: 25,
        score: 92,
      },
      {
        name: { en: 'Power conversion', zh: '电能转换' },
        weight: 25,
        score: 94,
      },
      {
        name: { en: 'Renewable energy use', zh: '可再生能源利用' },
        weight: 15,
        score: 92,
      },
    ],
  },
};

const visualLoads: VisualLoad[] = [
  {
    key: 'climate',
    icon: Wind,
    name: { en: 'Air conditioner', zh: '空调' },
    states: {
      camp: { on: true, value: { en: 'Auto · 23°C', zh: '自动 · 23°C' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Low · 22°C', zh: '低风 · 22°C' } },
      sleep: { on: true, value: { en: 'Sleep · 24°C', zh: '睡眠 · 24°C' } },
    },
  },
  {
    key: 'lights',
    icon: Lamp,
    name: { en: 'Lights', zh: '灯' },
    states: {
      camp: { on: true, value: { en: '100%', zh: '100%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: '35%', zh: '35%' } },
      sleep: { on: true, value: { en: '15%', zh: '15%' } },
    },
  },
  {
    key: 'coffee',
    icon: Coffee,
    name: { en: 'Coffee maker', zh: '咖啡机' },
    states: {
      camp: { on: true, value: { en: 'Brewing', zh: '冲煮中' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Ready', zh: '待机' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'shades',
    icon: Blinds,
    name: { en: 'Smart shades', zh: '智能遮阳帘' },
    states: {
      camp: { on: true, value: { en: 'Open', zh: '已打开' } },
      away: { on: false, value: { en: 'Closed', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Closed', zh: '已关闭' } },
      sleep: { on: false, value: { en: 'Closed', zh: '已关闭' } },
    },
  },
  {
    key: 'tv',
    icon: Tv,
    name: { en: 'Entertainment system', zh: '影音系统' },
    states: {
      camp: { on: true, value: { en: 'Standard', zh: '标准模式' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Cinema', zh: '影院模式' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'camera',
    icon: Camera,
    name: { en: 'Cabin camera', zh: '车内摄像头' },
    states: {
      camp: { on: false, value: { en: 'Privacy mode', zh: '隐私模式' } },
      away: {
        on: true,
        value: { en: 'Cabin live view', zh: '车内画面已开启' },
      },
      movie: { on: false, value: { en: 'Privacy mode', zh: '隐私模式' } },
      sleep: { on: true, value: { en: 'Night monitoring', zh: '夜间监控' } },
    },
  },
  {
    key: 'sentry-camera',
    icon: ScanLine,
    name: { en: 'Side-view mirror camera', zh: '外后视镜摄像头' },
    states: {
      camp: {
        on: false,
        value: { en: 'Sentry Mode off', zh: '哨兵模式已关闭' },
      },
      away: {
        on: true,
        value: { en: 'Exterior monitoring', zh: '车外监控中' },
      },
      movie: {
        on: false,
        value: { en: 'Sentry Mode off', zh: '哨兵模式已关闭' },
      },
      sleep: {
        on: true,
        value: { en: 'Night Sentry Mode', zh: '夜间哨兵模式' },
      },
    },
  },
  {
    key: 'microwave',
    icon: Microwave,
    name: { en: 'Microwave', zh: '微波炉' },
    states: {
      camp: { on: false, value: { en: 'Ready · Reheat', zh: '待启动 · 加热' } },
      away: { on: false, value: { en: 'Safety shutoff', zh: '安全断电' } },
      movie: { on: false, value: { en: 'Popcorn preset', zh: '爆米花预设' } },
      sleep: { on: false, value: { en: 'Night lock', zh: '夜间锁定' } },
    },
  },
  {
    key: 'induction',
    icon: CookingPot,
    name: { en: 'Induction cooktop', zh: '电磁炉' },
    states: {
      camp: { on: false, value: { en: 'Ready · Simmer', zh: '待启动 · 慢炖' } },
      away: { on: false, value: { en: 'Safety shutoff', zh: '安全断电' } },
      movie: { on: false, value: { en: 'Safety shutoff', zh: '安全断电' } },
      sleep: { on: false, value: { en: 'Night lock', zh: '夜间锁定' } },
    },
  },
  {
    key: 'humidifier',
    icon: Droplets,
    name: { en: 'Humidifier', zh: '加湿器' },
    states: {
      camp: { on: true, value: { en: 'Auto · 48%', zh: '自动 · 48%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: false, value: { en: 'Standby', zh: '待机' } },
      sleep: { on: true, value: { en: 'Auto · 48%', zh: '自动 · 48%' } },
    },
  },
  {
    key: 'ambient',
    icon: Sparkles,
    name: { en: 'Ambient', zh: '氛围灯' },
    states: {
      camp: { on: true, value: { en: 'Welcome · 35%', zh: '迎宾 · 35%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Cinema · 30%', zh: '影院 · 30%' } },
      sleep: { on: true, value: { en: 'Night · 15%', zh: '夜灯 · 15%' } },
    },
  },
  {
    key: 'audio',
    icon: Volume2,
    name: { en: 'Spatial audio', zh: '空间音响' },
    states: {
      camp: { on: true, value: { en: 'Music · 28%', zh: '音乐 · 28%' } },
      away: { on: false, value: { en: 'Off', zh: '已关闭' } },
      movie: { on: true, value: { en: 'Immersive', zh: '沉浸模式' } },
      sleep: { on: false, value: { en: 'Off', zh: '已关闭' } },
    },
  },
  {
    key: 'inverter',
    icon: Zap,
    name: { en: 'Inverter', zh: '逆变器' },
    states: {
      camp: { on: true, value: { en: 'Balanced', zh: '均衡模式' } },
      away: { on: true, value: { en: 'Eco', zh: '节能模式' } },
      movie: { on: true, value: { en: 'Performance', zh: '性能模式' } },
      sleep: { on: true, value: { en: 'Silent', zh: '静音模式' } },
    },
  },
  {
    key: 'lock',
    icon: Lock,
    name: { en: 'Entry lock', zh: '入户门锁' },
    states: {
      camp: { on: false, value: { en: 'Unlocked', zh: '已解锁' } },
      away: { on: true, value: { en: 'Secured', zh: '已锁定' } },
      movie: { on: false, value: { en: 'Unlocked', zh: '已解锁' } },
      sleep: { on: true, value: { en: 'Night lock', zh: '夜间锁定' } },
    },
  },
  {
    key: 'temperature-sensor',
    icon: Thermometer,
    kind: 'sensor',
    name: { en: 'Cabin temperature sensor', zh: '舱内温度传感器' },
    states: {
      camp: { on: true, value: { en: '23°C', zh: '23°C' } },
      away: { on: true, value: { en: '27°C', zh: '27°C' } },
      movie: { on: true, value: { en: '22°C', zh: '22°C' } },
      sleep: { on: true, value: { en: '24°C', zh: '24°C' } },
    },
  },
  {
    key: 'air-sensor',
    icon: Wind,
    kind: 'sensor',
    name: { en: 'Air quality sensor', zh: '空气质量传感器' },
    states: {
      camp: {
        on: true,
        value: { en: 'Excellent · CO₂ 620 ppm', zh: '优 · CO₂ 620 ppm' },
      },
      away: {
        on: true,
        value: { en: 'Excellent · CO₂ 580 ppm', zh: '优 · CO₂ 580 ppm' },
      },
      movie: {
        on: true,
        value: { en: 'Excellent · CO₂ 690 ppm', zh: '优 · CO₂ 690 ppm' },
      },
      sleep: {
        on: true,
        value: { en: 'Excellent · CO₂ 650 ppm', zh: '优 · CO₂ 650 ppm' },
      },
    },
  },
  {
    key: 'noise-sensor',
    icon: Waves,
    kind: 'sensor',
    name: { en: 'Cabin noise sensor', zh: '舱内噪声传感器' },
    states: {
      camp: { on: true, value: { en: '28 dB', zh: '28分贝' } },
      away: { on: true, value: { en: '26 dB', zh: '26分贝' } },
      movie: { on: true, value: { en: '31 dB', zh: '31分贝' } },
      sleep: { on: true, value: { en: '22 dB', zh: '22分贝' } },
    },
  },
];

const manualLoadValues: Record<LoadKey, { on: Localized; off: Localized }> = {
  climate: {
    on: { en: 'Manual · 24°C', zh: '手动 · 24°C' },
    off: { en: 'Powered off', zh: '已关闭' },
  },
  lights: {
    on: { en: '65%', zh: '65%' },
    off: { en: 'Off', zh: '已关闭' },
  },
  coffee: {
    on: { en: 'Brewing', zh: '冲煮中' },
    off: { en: 'Off', zh: '已关闭' },
  },
  shades: {
    on: { en: 'Open', zh: '已打开' },
    off: { en: 'Closed', zh: '已关闭' },
  },
  tv: {
    on: { en: 'Cinema', zh: '影院模式' },
    off: { en: 'Off', zh: '已关闭' },
  },
  camera: {
    on: { en: 'Cabin live view', zh: '车内画面已开启' },
    off: { en: 'Privacy mode', zh: '隐私模式' },
  },
  'sentry-camera': {
    on: { en: 'Exterior monitoring', zh: '车外监控中' },
    off: { en: 'Sentry Mode off', zh: '哨兵模式已关闭' },
  },
  humidifier: {
    on: { en: 'Auto · 48%', zh: '自动 · 48%' },
    off: { en: 'Standby', zh: '待机' },
  },
  ambient: {
    on: { en: 'Manual · 35%', zh: '手动 · 35%' },
    off: { en: 'Off', zh: '已关闭' },
  },
  audio: {
    on: { en: 'Immersive', zh: '沉浸模式' },
    off: { en: 'Off', zh: '已关闭' },
  },
  inverter: {
    on: { en: 'Manual power', zh: '手动供电' },
    off: { en: 'Powered off', zh: '已关闭' },
  },
  lock: {
    on: { en: 'Secured', zh: '已锁定' },
    off: { en: 'Unlocked', zh: '已解锁' },
  },
  microwave: {
    on: { en: 'Reheat · 800 W', zh: '加热 · 800 W' },
    off: { en: 'Ready · Manual start', zh: '待启动 · 手动确认' },
  },
  induction: {
    on: { en: 'Simmer · 600 W', zh: '慢炖 · 600 W' },
    off: { en: 'Safety shutoff', zh: '安全断电' },
  },
  'temperature-sensor': {
    on: { en: 'Online', zh: '在线' },
    off: { en: 'Offline', zh: '离线' },
  },
  'air-sensor': {
    on: { en: 'Online', zh: '在线' },
    off: { en: 'Offline', zh: '离线' },
  },
  'noise-sensor': {
    on: { en: 'Online', zh: '在线' },
    off: { en: 'Offline', zh: '离线' },
  },
};

const controlLabels: Record<string, Localized> = {
  Auto: { en: 'Auto', zh: '自动' },
  Cool: { en: 'Cool', zh: '制冷' },
  Fan: { en: 'Fan', zh: '送风' },
  Sleep: { en: 'Sleep', zh: '睡眠' },
  Low: { en: 'Low', zh: '低速' },
  Medium: { en: 'Medium', zh: '中速' },
  High: { en: 'High', zh: '高速' },
  Streaming: { en: 'Streaming', zh: '流媒体' },
  HDMI: { en: 'HDMI', zh: 'HDMI' },
  TV: { en: 'TV', zh: '电视' },
  Cinema: { en: 'Cinema', zh: '影院' },
  Standard: { en: 'Standard', zh: '标准' },
  Game: { en: 'Game', zh: '游戏' },
  Quiet: { en: 'Quiet', zh: '静音' },
  Boost: { en: 'Boost', zh: '强力' },
  Warm: { en: 'Warm', zh: '暖光' },
  Sunset: { en: 'Sunset', zh: '日落' },
  Ocean: { en: 'Ocean', zh: '海洋' },
  Violet: { en: 'Violet', zh: '紫罗兰' },
  Immersive: { en: 'Immersive', zh: '沉浸' },
  Music: { en: 'Music', zh: '音乐' },
  Night: { en: 'Night', zh: '夜间' },
  Eco: { en: 'Eco', zh: '节能' },
  Balanced: { en: 'Balanced', zh: '均衡' },
  Performance: { en: 'Performance', zh: '性能' },
  Silent: { en: 'Silent', zh: '静音' },
  Reheat: { en: 'Reheat', zh: '加热' },
  Defrost: { en: 'Defrost', zh: '解冻' },
  Popcorn: { en: 'Popcorn', zh: '爆米花' },
  Manual: { en: 'Manual', zh: '手动' },
  Simmer: { en: 'Simmer', zh: '慢炖' },
  Boil: { en: 'Boil', zh: '烧水' },
  Fry: { en: 'Fry', zh: '煎炒' },
  '30 sec': { en: '30 sec', zh: '30秒' },
  '1 min': { en: '1 min', zh: '1分钟' },
  Off: { en: 'Off', zh: '关闭' },
};

const controlTextFor = (value: string, locale: Locale) =>
  controlLabels[value]?.[locale] ?? value;

const deviceStateAssets = {
  climate: ['off', 'low', 'medium', 'high'],
  lights: ['off', 'warm', 'neutral', 'cool'],
  shades: ['open', 'half', 'closed'],
  tv: ['off', 'standard', 'cinema', 'game'],
  microwave: ['off', 'heating'],
  induction: ['off', 'heating'],
  humidifier: ['off', 'quiet', 'auto', 'boost'],
  ambient: ['off', 'warm', 'sunset', 'ocean', 'violet'],
  audio: ['off', 'music', 'immersive', 'night'],
  inverter: ['off', 'eco', 'balanced', 'performance', 'silent'],
  lock: ['unlocked', 'locked'],
} as const;

type DeviceVisualKey = keyof typeof deviceStateAssets;

const deviceAssetFolderByKey: Partial<Record<DeviceVisualKey, string>> = {
  climate: 'device-states-v4',
  lights: 'device-states-v3',
  shades: 'device-states-v3',
  microwave: 'device-states-v2',
  induction: 'device-states-v2',
};

function deviceStateAssetPath(
  deviceKey: DeviceVisualKey,
  state: string,
  part: 'upper' | 'lower' | null,
) {
  const assetFolder = deviceAssetFolderByKey[deviceKey] ?? 'device-states';
  const assetExtension = deviceKey === 'climate' ? 'png' : 'webp';

  return `/assets/${assetFolder}/${deviceKey}-${state}${part ? `-${part}` : ''}.${assetExtension}`;
}

function createSceneControls(scene: SceneKey): DeviceControls {
  const presets = {
    camp: {
      climateMode: 'Auto',
      target: 23,
      fan: 'Auto',
      main: 100,
      cct: 3200,
      shade: 100,
      humid: 48,
      ambient: 35,
      ambientColor: 'Warm',
      volume: 28,
      audio: 'Immersive',
      inverter: 'Balanced',
      microwaveProgram: 'Reheat',
      microwavePower: 800,
      microwaveTimer: 90,
      microwaveLock: false,
      inductionMode: 'Simmer',
      inductionPower: 600,
      inductionTimer: 15,
      inductionLock: false,
    },
    away: {
      climateMode: 'Auto',
      target: 27,
      fan: 'Low',
      main: 0,
      cct: 3200,
      shade: 0,
      humid: 45,
      ambient: 0,
      ambientColor: 'Warm',
      volume: 0,
      audio: 'Night',
      inverter: 'Eco',
      microwaveProgram: 'Reheat',
      microwavePower: 600,
      microwaveTimer: 60,
      microwaveLock: true,
      inductionMode: 'Simmer',
      inductionPower: 600,
      inductionTimer: 10,
      inductionLock: true,
    },
    movie: {
      climateMode: 'Cool',
      target: 22,
      fan: 'Low',
      main: 35,
      cct: 3000,
      shade: 0,
      humid: 48,
      ambient: 30,
      ambientColor: 'Violet',
      volume: 42,
      audio: 'Immersive',
      inverter: 'Performance',
      microwaveProgram: 'Popcorn',
      microwavePower: 900,
      microwaveTimer: 150,
      microwaveLock: false,
      inductionMode: 'Simmer',
      inductionPower: 500,
      inductionTimer: 10,
      inductionLock: true,
    },
    sleep: {
      climateMode: 'Sleep',
      target: 24,
      fan: 'Low',
      main: 15,
      cct: 2700,
      shade: 0,
      humid: 48,
      ambient: 15,
      ambientColor: 'Warm',
      volume: 0,
      audio: 'Night',
      inverter: 'Silent',
      microwaveProgram: 'Reheat',
      microwavePower: 600,
      microwaveTimer: 60,
      microwaveLock: true,
      inductionMode: 'Simmer',
      inductionPower: 500,
      inductionTimer: 10,
      inductionLock: true,
    },
  }[scene];

  return {
    climate: {
      mode: presets.climateMode,
      target: presets.target,
      fan: presets.fan,
    },
    lights: { brightness: presets.main, colorTemperature: presets.cct },
    coffee: { program: 'Brew' },
    shades: { position: presets.shade },
    tv: {
      source: 'Streaming',
      picture: scene === 'movie' ? 'Cinema' : 'Standard',
    },
    camera: {},
    'sentry-camera': {},
    humidifier: {
      targetHumidity: presets.humid,
      mode: scene === 'sleep' ? 'Quiet' : 'Auto',
    },
    ambient: { brightness: presets.ambient, color: presets.ambientColor },
    audio: { volume: presets.volume, profile: presets.audio },
    inverter: {
      mode: presets.inverter,
      outputLimit: scene === 'away' ? 600 : 1800,
    },
    lock: {
      autoLock: scene === 'away' || scene === 'sleep' ? '30 sec' : 'Off',
    },
    microwave: {
      program: presets.microwaveProgram,
      power: presets.microwavePower,
      timer: presets.microwaveTimer,
      doorClosed: true,
      safetyLock: presets.microwaveLock,
    },
    induction: {
      mode: presets.inductionMode,
      power: presets.inductionPower,
      timer: presets.inductionTimer,
      childLock: presets.inductionLock,
    },
  };
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('zh');
  const [activeScene, setActiveScene] = useState<SceneKey>('camp');
  const [pendingScene, setPendingScene] = useState<SceneKey | null>(null);
  const [intrusion, setIntrusion] = useState(false);
  const [loadSheetOpen, setLoadSheetOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [loadOverrides, setLoadOverrides] = useState<LoadOverrides>({});
  const [selectedLoadKey, setSelectedLoadKey] = useState<LoadKey | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [securityView, setSecurityView] = useState<SecurityView>('exterior');
  const [efficiencyOpen, setEfficiencyOpen] = useState(false);
  const [aiAdviceOpen, setAiAdviceOpen] = useState(false);
  const [efficiencyScene, setEfficiencyScene] = useState<SceneKey>('camp');
  const [healthCheckPhase, setHealthCheckPhase] =
    useState<HealthCheckPhase>('idle');
  const [lastHealthCheckScene, setLastHealthCheckScene] =
    useState<SceneKey | null>(null);
  const [selectedHealthCheckId, setSelectedHealthCheckId] = useState<
    string | null
  >(null);
  const [deviceLogs, setDeviceLogs] =
    useState<DeviceLogEntry[]>(initialDeviceLogs);
  const [deviceControls, setDeviceControls] = useState<DeviceControls>(() =>
    createSceneControls('camp'),
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceLogSequence = useRef(initialDeviceLogs.length + 1);
  const current = scenes[activeScene];
  const selectedEnergyInsight = energyInsights[efficiencyScene];
  const preview = scenes[pendingScene ?? activeScene];
  const PreviewIcon = preview.sceneIcon;
  const pick = (value: Localized) => value[locale];
  const getLoadState = (
    load: VisualLoad,
    scene: SceneKey = activeScene,
  ): LoadState => {
    const override = loadOverrides[scene]?.[load.key];
    const base =
      typeof override !== 'boolean'
        ? load.states[scene]
        : override && load.kind === 'sensor'
          ? load.states[scene]
          : {
              on: override,
              value: manualLoadValues[load.key][override ? 'on' : 'off'],
            };
    const controls = deviceControls[load.key] ?? {};
    const localized = (en: string, zh: string, on = true): LoadState => ({
      on,
      value: { en, zh },
    });
    if (!base.on || load.kind === 'sensor') {
      if (load.key === 'microwave' && controls.safetyLock === false) {
        return localized(
          `Ready · ${controlTextFor(String(controls.program), 'en')}`,
          `待启动 · ${controlTextFor(String(controls.program), 'zh')}`,
          false,
        );
      }
      if (load.key === 'induction' && controls.childLock === false) {
        return localized(
          `Ready · ${controlTextFor(String(controls.mode), 'en')}`,
          `待启动 · ${controlTextFor(String(controls.mode), 'zh')}`,
          false,
        );
      }
      return base;
    }
    switch (load.key) {
      case 'climate':
        return localized(
          `${controlTextFor(String(controls.mode), 'en')} · ${controls.target}°C`,
          `${controlTextFor(String(controls.mode), 'zh')} · ${controls.target}°C`,
        );
      case 'lights':
        return localized(`${controls.brightness}%`, `${controls.brightness}%`);
      case 'shades':
        return Number(controls.position) === 100
          ? localized('Open', '已打开')
          : Number(controls.position) === 0
            ? localized('Closed', '已关闭')
            : localized(
                `${controls.position}% open`,
                `开启${controls.position}%`,
              );
      case 'tv':
        return localized(
          `${controlTextFor(String(controls.source), 'en')} · On`,
          `${controlTextFor(String(controls.source), 'zh')} · 已开启`,
        );
      case 'humidifier':
        return localized(
          `${controlTextFor(String(controls.mode), 'en')} · ${controls.targetHumidity}%`,
          `${controlTextFor(String(controls.mode), 'zh')} · ${controls.targetHumidity}%`,
        );
      case 'ambient':
        return localized(
          `${controlTextFor(String(controls.color), 'en')} · ${controls.brightness}%`,
          `${controlTextFor(String(controls.color), 'zh')} · ${controls.brightness}%`,
        );
      case 'audio':
        return localized(
          `${controlTextFor(String(controls.profile), 'en')} · ${controls.volume}%`,
          `${controlTextFor(String(controls.profile), 'zh')} · ${controls.volume}%`,
        );
      case 'inverter':
        return localized(
          controlTextFor(String(controls.mode), 'en'),
          controlTextFor(String(controls.mode), 'zh'),
        );
      case 'microwave': {
        const seconds = Number(controls.timer ?? 90);
        const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        return localized(
          `${controlTextFor(String(controls.program), 'en')} · ${controls.power} W · ${time}`,
          `${controlTextFor(String(controls.program), 'zh')} · ${controls.power} W · ${time}`,
        );
      }
      case 'induction':
        return localized(
          `${controlTextFor(String(controls.mode), 'en')} · ${controls.power} W`,
          `${controlTextFor(String(controls.mode), 'zh')} · ${controls.power} W`,
        );
      default:
        return base;
    }
  };
  const getLoadByKey = (key: LoadKey) =>
    getLoadState(visualLoads.find((load) => load.key === key)!);
  // Designer-asset version: only devices with an approved visual/control entry
  // belong in hotspots, device sheets, diagnostics, and scene logs.
  // Shades remain scene-only; legacy microwave, cooktop, and lock controls stay hidden.
  const cabinLoadKeys: LoadKey[] = [
    'climate',
    'lights',
    'coffee',
    'tv',
    'camera',
    'sentry-camera',
    'humidifier',
    'audio',
    'inverter',
  ];
  const cabinLoads = visualLoads.filter(
    (load) => load.kind !== 'sensor' && cabinLoadKeys.includes(load.key),
  );
  const sensorDevices = visualLoads.filter((load) => load.kind === 'sensor');
  const activeLoads = [...cabinLoads, ...sensorDevices].filter(
    (load) => getLoadState(load).on,
  );
  const panelActiveLoads = activeLoads.filter((load) => load.key !== 'climate');
  const climateOn = getLoadByKey('climate').on;
  const mainLightsOn = getLoadByKey('lights').on;
  const ambientOn = getLoadByKey('ambient').on;
  const tvOn = getLoadByKey('tv').on;
  const indoorCameraOn = getLoadByKey('camera').on;
  const sentryCameraOn = getLoadByKey('sentry-camera').on;
  const cameraOn = indoorCameraOn;
  const securityPanelActive = indoorCameraOn || sentryCameraOn;
  const activeSecurityView: SecurityView =
    sentryCameraOn && indoorCameraOn
      ? securityView
      : sentryCameraOn
        ? 'exterior'
        : 'interior';
  const onlineCameraCount =
    (sentryCameraOn ? sentryCameras.length : 0) + (indoorCameraOn ? 1 : 0);
  const audioOn = getLoadByKey('audio').on;
  const humidifierOn = getLoadByKey('humidifier').on;
  const coffeeOn = getLoadByKey('coffee').on;
  const inverterOn = getLoadByKey('inverter').on;
  const lockOn = getLoadByKey('lock').on;
  const microwaveOn = getLoadByKey('microwave').on;
  const inductionOn = getLoadByKey('induction').on;
  const climateFan = String(
    deviceControls.climate?.fan ?? 'Auto',
  ).toLowerCase();
  const climateMode = String(
    deviceControls.climate?.mode ?? 'Auto',
  ).toLowerCase();
  const mainLightLevel = mainLightsOn
    ? Number(deviceControls.lights?.brightness ?? 65) / 100
    : 0;
  const mainLightTemperature = Number(
    deviceControls.lights?.colorTemperature ?? 3200,
  );
  const interiorCameraLightingStyle = {
    '--camera-feed-light-level': mainLightLevel,
    '--camera-feed-light-color':
      mainLightTemperature <= 3300
        ? 'rgba(255, 185, 112, 0.26)'
        : mainLightTemperature >= 5000
          ? 'rgba(150, 211, 255, 0.18)'
          : 'rgba(238, 224, 190, 0.2)',
  } as CSSProperties;
  const humidifierLevel = humidifierOn
    ? Number(deviceControls.humidifier?.targetHumidity ?? 48) / 100
    : 0;
  const humidifierMode = String(
    deviceControls.humidifier?.mode ?? 'Auto',
  ).toLowerCase();
  const mistLevel = !humidifierOn
    ? 0
    : humidifierMode === 'boost'
      ? 0.72
      : humidifierMode === 'quiet'
        ? 0.32
        : 0.28 + humidifierLevel * 0.38;
  const ambientLevel = ambientOn
    ? Number(deviceControls.ambient?.brightness ?? 35) / 100
    : 0;
  const ambientColorName = String(deviceControls.ambient?.color ?? 'Warm');
  const audioLevel = audioOn
    ? Number(deviceControls.audio?.volume ?? 28) / 100
    : 0;
  const microwavePower = microwaveOn
    ? Number(deviceControls.microwave?.power ?? 800)
    : 0;
  const inductionPower = inductionOn
    ? Number(deviceControls.induction?.power ?? 600)
    : 0;
  const shadePosition = Number(deviceControls.shades?.position ?? 100);
  const shadeClosedLevel = Math.max(0, Math.min(1, (75 - shadePosition) / 65));
  const climateVisualState = !climateOn
    ? 'off'
    : climateFan === 'high'
      ? 'high'
      : climateFan === 'low' || climateMode === 'sleep'
        ? 'low'
        : 'medium';
  const airflowLevel = !climateOn
    ? 0
    : climateFan === 'high'
      ? 1
      : climateFan === 'low' || climateMode === 'sleep'
        ? 0.6
        : 0.84;
  const lightVisualState = !mainLightsOn
    ? 'off'
    : mainLightTemperature <= 3300
      ? 'warm'
      : mainLightTemperature >= 5000
        ? 'cool'
        : 'neutral';
  const heroCabinImage = mainLightsOn
    ? `/assets/rv-cabin-main-light-${lightVisualState}-v2.webp`
    : '/assets/rv-cabin-empty-loads.webp';
  const sceneLightingStyle = {
    '--scene-light-level': mainLightLevel,
    '--scene-vignette-opacity': Math.max(0, 0.94 - mainLightLevel * 0.94),
    '--sleep-scene-brightness': 0.38 + mainLightLevel * 0.5,
    '--sleep-scene-sheen-opacity': Math.max(0, 0.74 - mainLightLevel * 0.74),
  } as CSSProperties;
  const shadeVisualState =
    shadePosition <= 10 ? 'closed' : shadePosition >= 75 ? 'open' : 'half';
  const tvPicture = String(
    deviceControls.tv?.picture ?? 'Standard',
  ).toLowerCase();
  const audioVisualMode = String(
    deviceControls.audio?.profile ?? 'Immersive',
  ).toLowerCase();
  const inverterVisualMode = String(
    deviceControls.inverter?.mode ?? 'Balanced',
  ).toLowerCase();
  const visualStateByDevice: Record<DeviceVisualKey, string> = {
    climate: climateVisualState,
    lights: lightVisualState,
    shades: shadeVisualState,
    tv: tvOn ? tvPicture : 'off',
    microwave: microwaveOn ? 'heating' : 'off',
    induction: inductionOn ? 'heating' : 'off',
    humidifier: humidifierOn ? humidifierMode : 'off',
    ambient: ambientOn ? ambientColorName.toLowerCase() : 'off',
    audio: audioOn ? audioVisualMode : 'off',
    inverter: inverterOn ? inverterVisualMode : 'off',
    lock: lockOn ? 'locked' : 'unlocked',
  };
  const visualLevelByDevice: Record<DeviceVisualKey, number> = {
    climate: 1,
    lights: 1,
    shades: 1,
    tv: 1,
    microwave: microwaveOn ? 0.45 + (microwavePower / 1000) * 0.55 : 1,
    induction: inductionOn ? 0.45 + (inductionPower / 1800) * 0.55 : 1,
    humidifier: humidifierOn ? 0.45 + humidifierLevel * 0.55 : 1,
    ambient: ambientOn ? 0.35 + ambientLevel * 0.65 : 1,
    audio: audioOn ? 0.55 + audioLevel * 0.45 : 1,
    inverter: 1,
    lock: 1,
  };
  const kitchenLoadWatts = microwavePower + inductionPower;
  const baseSceneLoadWatts = Number.parseFloat(current.load);
  const estimatedLoadWatts = (load: VisualLoad) => {
    switch (load.key) {
      case 'climate':
        return climateFan === 'high' ? 920 : climateFan === 'low' ? 480 : 680;
      case 'lights':
        return Math.round(72 * Math.max(mainLightLevel, 0.35));
      case 'coffee':
        return 850;
      case 'tv':
        return 120;
      case 'camera':
        return 18;
      case 'sentry-camera':
        return 30;
      case 'microwave':
        return Number(deviceControls.microwave?.power ?? 800);
      case 'induction':
        return Number(deviceControls.induction?.power ?? 600);
      case 'humidifier':
        return 45;
      case 'ambient':
        return Math.round(30 * Math.max(ambientLevel, 0.25));
      case 'audio':
        return 60;
      case 'inverter':
        return 28;
      case 'shades':
        return 8;
      case 'lock':
        return 5;
      default:
        return 0;
    }
  };
  const adjustableLoads = cabinLoads;
  const changedSceneLoads = adjustableLoads.filter(
    (load) => getLoadState(load).on !== load.states[activeScene].on,
  );
  const manuallyEnabledLoads = changedSceneLoads.filter(
    (load) => getLoadState(load).on && !load.states[activeScene].on,
  );
  const manuallyDisabledLoads = changedSceneLoads.filter(
    (load) => !getLoadState(load).on && load.states[activeScene].on,
  );
  const addedManualLoadWatts = manuallyEnabledLoads.reduce(
    (total, load) => total + estimatedLoadWatts(load),
    0,
  );
  const removedManualLoadWatts = manuallyDisabledLoads.reduce(
    (total, load) => total + estimatedLoadWatts(load),
    0,
  );
  const manualLoadDeltaWatts = addedManualLoadWatts - removedManualLoadWatts;
  const rvLoadWatts = Math.max(35, baseSceneLoadWatts + manualLoadDeltaWatts);
  const rvLoadValue = `${Math.round(rvLoadWatts)} W`;
  const batteryFlowKw =
    Math.round(
      (Number.parseFloat(current.batteryFlow) - manualLoadDeltaWatts / 1000) *
        100,
    ) / 100;
  const batteryIsCharging = batteryFlowKw >= 0;
  const batteryFlowPower = `${Math.abs(batteryFlowKw).toFixed(2)} kW`;
  const batteryFlowValue = `${batteryIsCharging ? '+' : '-'}${batteryFlowPower}`;
  const inverterOutputLimit = Number(
    deviceControls.inverter?.outputLimit ?? 1800,
  );
  const acDemandPresent = coffeeOn || tvOn;
  const hasInverterPowerConflict = !inverterOn && acDemandPresent;
  const hasOutputOverload = inverterOn && rvLoadWatts > inverterOutputLimit;
  const hasHeavyEnergyDeficit = batteryFlowKw < -1.5;
  const hasAwaySecurityGap =
    activeScene === 'away' && (!indoorCameraOn || !sentryCameraOn);
  const hasCriticalEnergyIssue =
    hasInverterPowerConflict ||
    hasOutputOverload ||
    hasHeavyEnergyDeficit ||
    hasAwaySecurityGap;
  const solarInputWatts = Math.round(Number.parseFloat(current.solar) * 1000);
  const comfortLoadCount = [tvOn, audioOn, coffeeOn, humidifierOn].filter(
    Boolean,
  ).length;
  const awayComfortKeys: LoadKey[] = [
    'climate',
    'lights',
    'coffee',
    'tv',
    'humidifier',
    'ambient',
    'audio',
  ];
  const manuallyEnabledComfortLoads = manuallyEnabledLoads.filter((load) =>
    awayComfortKeys.includes(load.key),
  );
  const changedLoadNames = {
    en: changedSceneLoads.map((load) => load.name.en).join(', '),
    zh: changedSceneLoads.map((load) => load.name.zh).join('、'),
  };
  const manuallyEnabledNames = {
    en: manuallyEnabledLoads.map((load) => load.name.en).join(', '),
    zh: manuallyEnabledLoads.map((load) => load.name.zh).join('、'),
  };
  const clampHealthScore = (score: number) =>
    Math.max(0, Math.min(100, Math.round(score)));
  const factorScore = (index: number, fallback: number) =>
    selectedEnergyInsight.factors[index]?.score ?? fallback;
  const loadSchedulingScore =
    hasOutputOverload || hasHeavyEnergyDeficit
      ? 52
      : clampHealthScore(
          factorScore(0, 92) -
            Math.ceil(addedManualLoadWatts / 140) -
            manuallyEnabledLoads.length * 2,
        );
  const standbyScore = clampHealthScore(
    factorScore(1, 88) -
      manuallyEnabledComfortLoads.length *
        (activeScene === 'away' || activeScene === 'sleep' ? 8 : 4),
  );
  const powerConversionScore =
    hasInverterPowerConflict || hasOutputOverload
      ? 48
      : clampHealthScore(
          factorScore(2, 94) -
            (rvLoadWatts > inverterOutputLimit * 0.8 ? 8 : 0),
        );
  const renewableUseScore = clampHealthScore(
    factorScore(3, 88) -
      (batteryFlowKw < 0 ? Math.ceil(Math.abs(batteryFlowKw) * 8) : 0) -
      (batteryFlowKw >= 0 && batteryFlowKw < 0.3 ? 4 : 0),
  );
  const sceneCoordinationScore = hasAwaySecurityGap
    ? 45
    : clampHealthScore(
        96 -
          changedSceneLoads.length *
            (activeScene === 'away' || activeScene === 'sleep' ? 8 : 4),
      );
  const healthDiagnostics: HealthDiagnostic[] = [
    {
      id: 'load-scheduling',
      name: { en: 'Load scheduling', zh: '负载调度' },
      level:
        hasOutputOverload || hasHeavyEnergyDeficit
          ? 'urgent'
          : getHealthLevel(loadSchedulingScore),
      score: loadSchedulingScore,
      device: {
        en: 'Inverter / all RV loads',
        zh: '逆变器 / 全车负载',
      },
      observed: {
        en: manuallyEnabledLoads.length
          ? `${manuallyEnabledNames.en} were manually enabled. Total load is now ${rvLoadValue}, ${addedManualLoadWatts} W above the scene preset.`
          : `Total load is ${rvLoadValue}; inverter output limit is ${inverterOutputLimit} W.`,
        zh: manuallyEnabledLoads.length
          ? `手动开启了${manuallyEnabledNames.zh}，当前总负载${rvLoadValue}，比场景预设增加 ${addedManualLoadWatts} W。`
          : `当前总负载${rvLoadValue}，逆变器输出上限 ${inverterOutputLimit} W。`,
      },
      impact: hasOutputOverload
        ? {
            en: 'The demand exceeds the inverter limit and may trigger overload protection or interrupt AC devices.',
            zh: '负载已超过逆变器上限，可能触发过载保护并中断交流设备。',
          }
        : manuallyEnabledLoads.length
          ? {
              en: "The added loads reduce solar charging headroom and shorten the system's available runtime.",
              zh: '新增负载正在压缩太阳能充电余量，并缩短整套系统的可使用时长。',
            }
          : {
              en: 'Running multiple high-power devices together shortens usable battery time and raises peak demand.',
              zh: '多台大功率设备同时运行会缩短续航，并提高瞬时峰值。',
            },
      recommendation: hasOutputOverload
        ? {
            en: 'Immediately stop one high-power appliance, or raise the inverter limit only after confirming the hardware rating.',
            zh: '请立即关闭一项大功率设备；如需提高输出上限，请先确认逆变器和线路额定能力。',
          }
        : manuallyEnabledLoads.length
          ? {
              en: `Turn off ${manuallyEnabledNames.en} before leaving, or keep only the devices that are truly required.`,
              zh: `离车前建议关闭${manuallyEnabledNames.zh}，或仅保留确有必要的设备。`,
            }
          : {
              en: 'Stagger high-power appliances and reserve peak power for the device currently in use.',
              zh: '建议将大功率设备错峰使用，将峰值功率留给当前任务。',
            },
    },
    {
      id: 'standby-control',
      name: { en: 'Standby power management', zh: '待机能耗管理' },
      level: getHealthLevel(standbyScore),
      score: standbyScore,
      device: {
        en: 'Entertainment system / spatial audio / coffee maker',
        zh: '影音系统 / 空间音响 / 咖啡机',
      },
      observed: {
        en: `${comfortLoadCount} comfort ${comfortLoadCount === 1 ? 'device is' : 'devices are'} currently on or in standby.`,
        zh: `当前有${comfortLoadCount}项舒适类设备处于开启或待机状态。`,
      },
      impact: {
        en: 'Long standby periods accumulate background consumption and reduce overnight reserve.',
        zh: '长时间待机会累积后台能耗，并减少夜间储能余量。',
      },
      recommendation: {
        en: 'Shut down entertainment, audio and coffee appliances automatically when Away or Sleep mode starts.',
        zh: '建议在外出或睡眠场景中自动关闭影音、音响和咖啡机。',
      },
    },
    {
      id: 'power-conversion',
      name: { en: 'Power conversion', zh: '电能转换' },
      level:
        hasInverterPowerConflict || hasOutputOverload
          ? 'urgent'
          : getHealthLevel(powerConversionScore),
      score: powerConversionScore,
      device: { en: 'Inverter', zh: '逆变器' },
      observed: hasInverterPowerConflict
        ? {
            en: 'The inverter is off while AC appliances still request power.',
            zh: '逆变器已关闭，但仍有交流设备请求供电。',
          }
        : {
            en: `The inverter is ${inverterOn ? 'on' : 'off'} with a ${inverterOutputLimit} W output limit.`,
            zh: `逆变器当前${inverterOn ? '已开启' : '已关闭'}，输出上限 ${inverterOutputLimit} W。`,
          },
      impact: hasInverterPowerConflict
        ? {
            en: 'The requested devices cannot receive stable AC power and may repeatedly disconnect.',
            zh: '相关设备无法获得稳定交流供电，可能反复掉线或无法启动。',
          }
        : {
            en: 'The current conversion strategy matches the active load profile.',
            zh: '当前电能转换策略与负载类型匹配。',
          },
      recommendation: hasInverterPowerConflict
        ? {
            en: 'Turn the inverter on now, or shut down all AC appliances before continuing.',
            zh: '请立即开启逆变器，或关闭所有交流负载后再继续使用。',
          }
        : {
            en: 'Keep the current strategy and review the output limit before starting another high-power appliance.',
            zh: '可保持当前策略；启动其他大功率设备前，建议复核输出上限。',
          },
    },
    {
      id: 'renewable-use',
      name: { en: 'Renewable energy use', zh: '可再生能源利用' },
      level: getHealthLevel(renewableUseScore),
      score: renewableUseScore,
      device: { en: 'Solar array / battery', zh: '太阳能板 / 储能电池' },
      observed: {
        en: `Solar input is ${solarInputWatts} W, the battery is ${batteryIsCharging ? 'charging' : 'discharging'} at ${batteryFlowPower}, and total load is ${rvLoadValue}.`,
        zh: `太阳能输入 ${solarInputWatts} W，电池当前以 ${batteryFlowPower}${batteryIsCharging ? '充电' : '放电'}，总负载${rvLoadValue}。`,
      },
      impact: {
        en: 'The current solar capacity leaves limited charging headroom. With sustained high loads, the entire system cannot support extended use.',
        zh: '当前太阳能功率偏小，充电余量不足；当总负载持续偏高时，整套系统无法支撑长时间使用。',
      },
      recommendation: {
        en: 'Increase the total solar array capacity to 3000 W as soon as possible, and schedule high-power loads during the strongest solar window.',
        zh: '请尽快将太阳能板总功率增加至 3000 W，并将大功率负载安排在日照最强时段使用。',
      },
    },
    {
      id: 'scene-coordination',
      name: { en: 'Scene automation', zh: '场景联动' },
      level: hasAwaySecurityGap
        ? 'urgent'
        : getHealthLevel(sceneCoordinationScore),
      score: sceneCoordinationScore,
      device: changedSceneLoads.length
        ? changedLoadNames
        : { en: 'Scene automation', zh: '场景联动' },
      observed: {
        en: changedSceneLoads.length
          ? `${changedSceneLoads.length} device settings now differ from the ${scenes[activeScene].name.en} preset: ${changedLoadNames.en}.`
          : `${scenes[activeScene].name.en} mode has applied its coordinated device settings.`,
        zh: changedSceneLoads.length
          ? `当前有${changedSceneLoads.length}项设备状态偏离${scenes[activeScene].name.zh}场景预设：${changedLoadNames.zh}。`
          : `${scenes[activeScene].name.zh}场景已完成设备联动。`,
      },
      impact: hasAwaySecurityGap
        ? {
            en: 'Away protection is incomplete, so the vehicle no longer has full interior and exterior camera coverage.',
            zh: '外出防护已不完整，车辆无法保持完整的车内外摄像覆盖。',
          }
        : changedSceneLoads.length
          ? {
              en: 'Manual changes have weakened the intended energy-saving behavior of this scene.',
              zh: '手动变更已削弱该场景原本的节能联动效果。',
            }
          : {
              en: 'No conflicting scene actions were detected.',
              zh: '未发现相互冲突的场景动作。',
            },
      recommendation: hasAwaySecurityGap
        ? {
            en: 'Immediately restore the cabin camera and side-view mirror camera required by Away mode.',
            zh: '请立即恢复外出场景所需的车内摄像头和外后视镜摄像头。',
          }
        : changedSceneLoads.length
          ? {
              en: `Restore the ${scenes[activeScene].name.en} preset when manual use is finished.`,
              zh: `手动使用完成后，建议恢复${scenes[activeScene].name.zh}场景预设。`,
            }
          : {
              en: 'Keep the current automation rules.',
              zh: '建议保持当前自动化规则。',
            },
    },
  ];
  const selectedHealthIssueCount = healthDiagnostics.filter(
    (item) => item.level !== 'excellent',
  ).length;
  const selectedUrgentIssueCount = healthDiagnostics.filter(
    (item) => item.level === 'urgent',
  ).length;
  const selectedImproveIssueCount = healthDiagnostics.filter(
    (item) => item.level === 'improve',
  ).length;
  const selectedHealthDiagnostic = healthDiagnostics.find(
    (item) => item.id === selectedHealthCheckId,
  );
  const healthPassedActions = healthDiagnostics
    .filter((diagnostic) => diagnostic.level === 'excellent')
    .slice(0, 3)
    .map((diagnostic) => ({
      en: `${diagnostic.name.en} is normal`,
      zh: `${diagnostic.name.zh}状态正常`,
    }));
  const urgentHealthRecommendation = hasInverterPowerConflict
    ? healthDiagnostics.find((item) => item.id === 'power-conversion')
        ?.recommendation
    : hasOutputOverload || hasHeavyEnergyDeficit
      ? healthDiagnostics.find((item) => item.id === 'load-scheduling')
          ?.recommendation
      : hasAwaySecurityGap
        ? healthDiagnostics.find((item) => item.id === 'scene-coordination')
            ?.recommendation
        : undefined;
  const calculatedHealthScore = Math.round(
    healthDiagnostics.reduce(
      (total, diagnostic) => total + diagnostic.score,
      0,
    ) / healthDiagnostics.length,
  );
  const selectedHealthScore = hasCriticalEnergyIssue
    ? Math.min(59, calculatedHealthScore)
    : calculatedHealthScore;
  const selectedHealthLevel: HealthLevel =
    selectedUrgentIssueCount > 0
      ? 'urgent'
      : selectedImproveIssueCount > 0
        ? 'improve'
        : 'excellent';
  const activeHealthLevel = selectedHealthLevel;
  const selectedHealthTitle = getHealthTitle(selectedHealthLevel);
  const activeHealthTitle = getHealthTitle(activeHealthLevel);
  const healthResultIsFresh = lastHealthCheckScene === activeScene;
  const dynamicHealthExplanation: Localized = changedSceneLoads.length
    ? {
        en: `${changedSceneLoads.length} manual device changes were detected. Current total load is ${rvLoadValue}, and the checkup has recalculated the score from the live configuration.`,
        zh: `检测到${changedSceneLoads.length}项设备被手动变更，当前总负载${rvLoadValue}，体检已按实时配置重新计算。`,
      }
    : selectedEnergyInsight.explanation;
  const SelectedHealthIcon =
    selectedHealthLevel === 'urgent'
      ? ShieldAlert
      : selectedHealthLevel === 'improve'
        ? Gauge
        : ShieldCheck;
  const batteryFlowLabel = batteryIsCharging
    ? locale === 'en'
      ? 'Charging'
      : '充电中'
    : locale === 'en'
      ? 'Discharging'
      : '放电中';
  const estimatedRuntime =
    kitchenLoadWatts === 0 || batteryIsCharging
      ? current.runtime
      : `${Math.max(1, Math.floor(9.8 / Math.abs(batteryFlowKw)))} h`;
  const forecastCurvePath = batteryIsCharging
    ? 'M2 49 C28 45 31 32 55 35 S84 16 108 22 S145 8 178 13'
    : 'M2 11 C28 14 38 22 58 20 S91 33 112 31 S149 46 178 49';
  const usableBatteryKwh = 8.2;
  const microwaveSessionKwh = microwaveOn
    ? (microwavePower / 1000) *
      (Number(deviceControls.microwave?.timer ?? 90) / 3600)
    : 0;
  const inductionSessionKwh = inductionOn
    ? (inductionPower / 1000) *
      (Number(deviceControls.induction?.timer ?? 15) / 60)
    : 0;
  const remainingBatteryKwh = Math.max(
    0,
    usableBatteryKwh - microwaveSessionKwh - inductionSessionKwh,
  );
  const habitEnergy = { meal: 0.65, movie: 1.6, sleep: 2.4, daily: 5.3 };
  const supportedMeals = Math.floor(remainingBatteryKwh / habitEnergy.meal);
  const supportedMovies = Math.floor(remainingBatteryKwh / habitEnergy.movie);
  const supportedNights = Math.floor(remainingBatteryKwh / habitEnergy.sleep);
  const supportedRoutineDays = (
    remainingBatteryKwh / habitEnergy.daily
  ).toFixed(1);
  const dailyRoutineSupported = remainingBatteryKwh >= habitEnergy.daily;
  const aiSummary =
    kitchenLoadWatts > 0
      ? batteryIsCharging
        ? locale === 'en'
          ? `Solar still covers the ${kitchenLoadWatts} W kitchen load. Your usual day remains supported.`
          : `太阳能仍可覆盖${kitchenLoadWatts} W厨房负载，日常用能计划可继续维持。`
        : microwaveOn && inductionOn
          ? locale === 'en'
            ? `Both kitchen loads are drawing the battery at ${batteryFlowPower}. Stagger cooking to reduce the peak.`
            : `两项厨房负载使电池以${batteryFlowPower}放电，建议错峰烹饪以降低峰值。`
          : locale === 'en'
            ? `Cooking is included in the forecast. Your usual routine can continue for about ${supportedRoutineDays} days.`
            : `烹饪用电已计入预测，按日常习惯预计仍可维持约${supportedRoutineDays}天。`
      : locale === 'en'
        ? `Based on your daily habits, the current battery supports about ${supportedRoutineDays} days.`
        : `根据你的日常习惯，当前电量预计可维持约${supportedRoutineDays}天。`;
  const aiRecommendation =
    microwaveOn && inductionOn
      ? locale === 'en'
        ? `Finish the microwave cycle first, then use the cooktop. This removes ${Math.min(microwavePower, inductionPower)} W from the current peak without changing the meal plan.`
        : `建议先完成微波炉加热，再使用电磁炉；这样可在不影响做饭计划的情况下，将当前峰值降低${Math.min(microwavePower, inductionPower)} W。`
      : kitchenLoadWatts > 0
        ? locale === 'en'
          ? 'Keep the cooking timer active and avoid starting the second kitchen appliance during a climate boost.'
          : '建议保留烹饪定时，并避免在空调强力运行时同时启动另一项厨房电器。'
        : locale === 'en'
          ? 'Use high-power cooking during the strongest solar window; reserve evening battery for movies and overnight comfort.'
          : '建议在太阳能最强时段使用高功率烹饪设备，将晚间电量留给观影与整夜舒适环境。';
  const temperatureSensor = getLoadByKey('temperature-sensor');
  const airSensor = getLoadByKey('air-sensor');
  const noiseSensor = getLoadByKey('noise-sensor');
  const onlineSensorCount = sensorDevices.filter(
    (load) => getLoadState(load).on,
  ).length;
  const temperatureReading = pick(temperatureSensor.value).replace('°C', '');
  const selectedLoad = selectedLoadKey
    ? ([...cabinLoads, ...sensorDevices].find(
        (load) => load.key === selectedLoadKey,
      ) ?? null)
    : null;
  const selectedCamera = selectedCameraId
    ? (securityCameras.find((camera) => camera.id === selectedCameraId) ?? null)
    : null;

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!efficiencyOpen || healthCheckPhase !== 'scanning') return;
    setSelectedHealthCheckId(null);
    const healthCheckTimer = window.setTimeout(() => {
      setHealthCheckPhase('complete');
      setLastHealthCheckScene(efficiencyScene);
    }, 1600);
    return () => window.clearTimeout(healthCheckTimer);
  }, [efficiencyOpen, efficiencyScene, healthCheckPhase]);
  useEffect(() => {
    setLastHealthCheckScene(null);
  }, [activeScene, deviceControls, loadOverrides]);
  function addDeviceLog(
    sourceKey: string,
    device: Localized,
    detail: Localized,
    sceneTime = current.time,
    actions?: DeviceLogAction[],
  ) {
    const entry: DeviceLogEntry = {
      id: deviceLogSequence.current++,
      sourceKey,
      device,
      detail,
      time: toLogTime(sceneTime),
      actions,
    };
    setDeviceLogs((previous) => {
      if (!actions?.length && previous[0]?.sourceKey === sourceKey) {
        return [entry, ...previous.slice(1)];
      }
      return [entry, ...previous];
    });
  }

  function describeSceneAction(
    load: VisualLoad,
    scene: SceneKey,
    controls: Record<string, ControlValue>,
  ): Localized {
    const targetState = load.states[scene];
    if (load.key === 'climate') {
      return targetState.on
        ? {
            en: `Set to ${controlTextFor(String(controls.mode), 'en')} · ${controls.target}°C · ${controlTextFor(String(controls.fan), 'en')} fan`,
            zh: `切换至${controlTextFor(String(controls.mode), 'zh')}模式 · ${controls.target}°C · ${controlTextFor(String(controls.fan), 'zh')}风`,
          }
        : { en: 'Turned off', zh: '关闭空调' };
    }
    if (load.key === 'lights') {
      return targetState.on
        ? {
            en: `Brightness ${controls.brightness}% · ${controls.colorTemperature} K`,
            zh: `亮度调至${controls.brightness}% · 色温${controls.colorTemperature}K`,
          }
        : { en: 'Turned off', zh: '关闭灯光' };
    }
    if (load.key === 'coffee') {
      return targetState.on
        ? { en: 'Started brewing', zh: '开始冲煮' }
        : {
            en: `Set to ${targetState.value.en.toLowerCase()}`,
            zh: `切换至${targetState.value.zh}`,
          };
    }
    if (load.key === 'shades') {
      const position = Number(controls.position);
      return position === 0
        ? { en: 'Fully closed', zh: '全部关闭' }
        : position === 100
          ? { en: 'Fully opened', zh: '全部打开' }
          : {
              en: `Opened to ${position}%`,
              zh: `开启至${position}%`,
            };
    }
    if (load.key === 'tv') {
      return targetState.on
        ? {
            en: `Turned on · ${controlTextFor(String(controls.picture), 'en')} picture · ${controlTextFor(String(controls.source), 'en')}`,
            zh: `开启 · ${controlTextFor(String(controls.picture), 'zh')}画面 · ${controlTextFor(String(controls.source), 'zh')}`,
          }
        : { en: 'Turned off', zh: '关闭影音系统' };
    }
    if (load.key === 'camera') {
      return targetState.on
        ? scene === 'sleep'
          ? { en: 'Cabin night monitoring enabled', zh: '开启车内夜间监控' }
          : { en: 'Cabin live view enabled', zh: '开启车内实时画面' }
        : {
            en: 'Cabin camera off · Privacy mode',
            zh: '关闭车内摄像头 · 进入隐私模式',
          };
    }
    if (load.key === 'sentry-camera') {
      return targetState.on
        ? scene === 'sleep'
          ? {
              en: 'Exterior Night Sentry Mode enabled',
              zh: '开启车外夜间哨兵模式',
            }
          : { en: 'Exterior Sentry Mode enabled', zh: '开启车外哨兵模式' }
        : {
            en: 'Exterior Sentry Mode off',
            zh: '关闭车外哨兵模式',
          };
    }
    if (load.key === 'microwave') {
      return controls.safetyLock === true
        ? {
            en: 'Heating stopped · Safety lock enabled',
            zh: '停止加热 · 开启安全锁',
          }
        : {
            en: `${controlTextFor(String(controls.program), 'en')} preset ready · Manual start required`,
            zh: `${controlTextFor(String(controls.program), 'zh')}预设就绪 · 等待手动启动`,
          };
    }
    if (load.key === 'induction') {
      return controls.childLock === true
        ? {
            en: 'Heating stopped · Child lock enabled',
            zh: '停止加热 · 开启童锁',
          }
        : {
            en: `${controlTextFor(String(controls.mode), 'en')} preset ready · Manual start required`,
            zh: `${controlTextFor(String(controls.mode), 'zh')}预设就绪 · 等待手动启动`,
          };
    }
    if (load.key === 'humidifier') {
      return targetState.on
        ? {
            en: `${controlTextFor(String(controls.mode), 'en')} · Target ${controls.targetHumidity}%`,
            zh: `${controlTextFor(String(controls.mode), 'zh')}模式 · 目标湿度${controls.targetHumidity}%`,
          }
        : { en: 'Turned off', zh: '关闭加湿器' };
    }
    if (load.key === 'audio') {
      return targetState.on
        ? {
            en: `${controlTextFor(String(controls.profile), 'en')} · Volume ${controls.volume}%`,
            zh: `${controlTextFor(String(controls.profile), 'zh')}模式 · 音量${controls.volume}%`,
          }
        : { en: 'Muted and turned off', zh: '静音并关闭' };
    }
    if (load.key === 'inverter') {
      return targetState.on
        ? {
            en: `${controlTextFor(String(controls.mode), 'en')} mode · ${controls.outputLimit} W limit`,
            zh: `切换至${controlTextFor(String(controls.mode), 'zh')}模式 · 输出上限${controls.outputLimit}W`,
          }
        : { en: 'Turned off', zh: '关闭逆变器' };
    }
    if (load.key === 'lock') {
      return targetState.on
        ? scene === 'sleep'
          ? { en: 'Night lock enabled', zh: '启用夜间上锁' }
          : { en: 'Locked', zh: '上锁' }
        : { en: 'Unlocked', zh: '解锁' };
    }
    return targetState.value;
  }

  function getSceneDeviceActions(scene: SceneKey): DeviceLogAction[] {
    const targetControls = createSceneControls(scene);

    return visualLoads
      .filter((load) => cabinLoadKeys.includes(load.key))
      .filter((load) => {
        const currentState = getLoadState(load);
        const targetState = load.states[scene];
        const currentControls = deviceControls[load.key] ?? {};
        const nextControls = targetControls[load.key] ?? {};
        return (
          currentState.on !== targetState.on ||
          JSON.stringify(currentControls) !== JSON.stringify(nextControls)
        );
      })
      .map((load) => ({
        device: load.name,
        detail: describeSceneAction(
          load,
          scene,
          targetControls[load.key] ?? {},
        ),
      }));
  }

  function describeControlChange(
    field: string,
    value: ControlValue,
  ): Localized {
    const labels: Record<string, Localized> = {
      brightness: { en: 'Brightness', zh: '亮度' },
      colorTemperature: { en: 'Color temperature', zh: '色温' },
      mode: { en: 'Mode', zh: '模式' },
      target: { en: 'Temperature', zh: '温度' },
      fan: { en: 'Fan', zh: '风速' },
      position: { en: 'Open position', zh: '开合度' },
      targetHumidity: { en: 'Target humidity', zh: '目标湿度' },
      volume: { en: 'Volume', zh: '音量' },
      profile: { en: 'Sound profile', zh: '声场模式' },
      source: { en: 'Input source', zh: '输入源' },
      picture: { en: 'Picture preset', zh: '画面模式' },
      program: { en: 'Program', zh: '程序' },
      power: { en: 'Power', zh: '功率' },
      timer: { en: 'Timer', zh: '定时' },
      outputLimit: { en: 'Output limit', zh: '输出上限' },
      color: { en: 'Color', zh: '颜色' },
      autoLock: { en: 'Auto lock', zh: '自动上锁' },
      childLock: { en: 'Child lock', zh: '童锁' },
      safetyLock: { en: 'Safety lock', zh: '安全锁' },
    };
    const label = labels[field] ?? { en: 'Setting', zh: '设置' };
    const unit =
      field === 'brightness' ||
      field === 'position' ||
      field === 'targetHumidity' ||
      field === 'volume'
        ? '%'
        : field === 'target'
          ? '°C'
          : field === 'colorTemperature'
            ? 'K'
            : field === 'power' || field === 'outputLimit'
              ? 'W'
              : '';
    const displayValue =
      typeof value === 'boolean'
        ? {
            en: value ? 'On' : 'Off',
            zh: value ? '开启' : '关闭',
          }
        : typeof value === 'string'
          ? {
              en: `${controlTextFor(value, 'en')}${unit}`,
              zh: `${controlTextFor(value, 'zh')}${unit}`,
            }
          : { en: `${value}${unit}`, zh: `${value}${unit}` };
    return {
      en: `${label.en} · ${displayValue.en}`,
      zh: `${label.zh} · ${displayValue.zh}`,
    };
  }

  function describePowerChange(load: VisualLoad, on: boolean): Localized {
    if (load.key === 'camera') {
      return on
        ? { en: 'Cabin live view on', zh: '车内画面已开启' }
        : { en: 'Privacy mode', zh: '隐私模式' };
    }
    if (load.key === 'sentry-camera') {
      return on
        ? { en: 'Exterior Sentry Mode on', zh: '车外哨兵模式已开启' }
        : { en: 'Exterior Sentry Mode off', zh: '车外哨兵模式已关闭' };
    }
    if (load.key === 'lock') {
      return on
        ? { en: 'Locked', zh: '已上锁' }
        : { en: 'Unlocked', zh: '已解锁' };
    }
    if (load.key === 'shades') {
      return on
        ? { en: 'Opened', zh: '已打开' }
        : { en: 'Closed', zh: '已关闭' };
    }
    return on
      ? { en: 'Turned on', zh: '已开启' }
      : { en: 'Turned off', zh: '已关闭' };
  }

  function activateScene(key: SceneKey) {
    if (key === activeScene && !pendingScene) return;
    if (timer.current) clearTimeout(timer.current);
    const sceneActions = getSceneDeviceActions(key);
    setLoadOverrides({});
    setDeviceControls(createSceneControls(key));
    setLoadSheetOpen(false);
    setAiAdviceOpen(false);
    setSelectedLoadKey(null);
    setSelectedCameraId(null);
    setSecurityView('exterior');
    setIntrusion(false);
    setPendingScene(key);
    timer.current = setTimeout(() => {
      setActiveScene(key);
      setPendingScene(null);
      addDeviceLog(
        `scene-mode-${key}`,
        {
          en: `${scenes[key].name.en} scene`,
          zh: `${scenes[key].name.zh}场景`,
        },
        {
          en: `${sceneActions.length} device actions completed`,
          zh: `已执行${sceneActions.length}项设备联动`,
        },
        scenes[key].time,
        sceneActions,
      );
    }, 980);
  }

  function resetDemo() {
    if (timer.current) clearTimeout(timer.current);
    setPendingScene(null);
    setIntrusion(false);
    setLoadOverrides((previous) => {
      const next = { ...previous };
      delete next[activeScene];
      return next;
    });
    setDeviceControls(createSceneControls(activeScene));
    setSelectedLoadKey(null);
    setSelectedCameraId(null);
    setSecurityView('exterior');
    setLoadSheetOpen(false);
    setEfficiencyOpen(false);
    setAiAdviceOpen(false);
    setEfficiencyScene(activeScene);
    addDeviceLog(
      'system-reset',
      { en: 'System', zh: '系统' },
      { en: 'Scene defaults restored', zh: '已恢复场景初始设置' },
    );
  }

  function syncCameraUiAfterPowerChange(key: LoadKey, on: boolean) {
    if (key === 'camera') {
      if (on && !sentryCameraOn) setSecurityView('interior');
      if (!on) {
        if (selectedCameraId === indoorCamera.id) setSelectedCameraId(null);
        if (sentryCameraOn) setSecurityView('exterior');
      }
    }
    if (key === 'sentry-camera') {
      if (on) {
        setSecurityView('exterior');
      } else {
        setIntrusion(false);
        if (
          selectedCameraId &&
          sentryCameras.some((camera) => camera.id === selectedCameraId)
        ) {
          setSelectedCameraId(null);
        }
        if (indoorCameraOn) setSecurityView('interior');
      }
    }
  }

  function toggleLoad(load: VisualLoad) {
    if (load.kind === 'sensor') return;
    const next = !getLoadState(load).on;
    if (
      load.key === 'microwave' &&
      next &&
      deviceControls.microwave?.safetyLock === true
    )
      return;
    if (
      load.key === 'induction' &&
      next &&
      deviceControls.induction?.childLock === true
    )
      return;
    setDeviceControls((previous) => {
      const currentControls = previous[load.key] ?? {};
      const nextControls = { ...currentControls };
      if (load.key === 'shades') nextControls.position = next ? 100 : 0;
      if (
        load.key === 'lights' &&
        next &&
        Number(nextControls.brightness ?? 0) === 0
      )
        nextControls.brightness = 65;
      if (
        load.key === 'ambient' &&
        next &&
        Number(nextControls.brightness ?? 0) === 0
      )
        nextControls.brightness = 35;
      if (
        load.key === 'audio' &&
        next &&
        Number(nextControls.volume ?? 0) === 0
      )
        nextControls.volume = 28;
      return { ...previous, [load.key]: nextControls };
    });
    setLoadOverrides((previous) => ({
      ...previous,
      [activeScene]: { ...previous[activeScene], [load.key]: next },
    }));
    addDeviceLog(
      `power-${load.key}`,
      load.name,
      describePowerChange(load, next),
    );
    syncCameraUiAfterPowerChange(load.key, next);
  }

  function setLoadPower(load: VisualLoad, on: boolean, recordLog = true) {
    if (load.kind === 'sensor') return;
    if (
      load.key === 'microwave' &&
      on &&
      deviceControls.microwave?.safetyLock === true
    )
      return;
    if (
      load.key === 'induction' &&
      on &&
      deviceControls.induction?.childLock === true
    )
      return;
    setLoadOverrides((previous) => ({
      ...previous,
      [activeScene]: { ...previous[activeScene], [load.key]: on },
    }));
    if (recordLog) {
      addDeviceLog(
        `power-${load.key}`,
        load.name,
        describePowerChange(load, on),
      );
    }
    syncCameraUiAfterPowerChange(load.key, on);
  }

  function updateDeviceControl(
    key: LoadKey,
    field: string,
    value: ControlValue,
  ) {
    setDeviceControls((previous) => ({
      ...previous,
      [key]: { ...previous[key], [field]: value },
    }));
    const changedLoad = visualLoads.find((item) => item.key === key);
    if (changedLoad) {
      addDeviceLog(
        `control-${key}-${field}`,
        changedLoad.name,
        describeControlChange(field, value),
      );
    }
    if (key === 'shades' && field === 'position') {
      const opened = Number(value) > 0;
      const load = visualLoads.find((item) => item.key === key)!;
      setLoadPower(load, opened, false);
    }
    if (key === 'induction' && field === 'childLock' && Boolean(value)) {
      const load = visualLoads.find((item) => item.key === key)!;
      setLoadPower(load, false);
    }
    if (key === 'microwave' && field === 'safetyLock' && Boolean(value)) {
      const load = visualLoads.find((item) => item.key === key)!;
      setLoadPower(load, false);
    }
  }

  function handleSheetOpenChange(open: boolean) {
    setLoadSheetOpen(open);
    if (!open) setSelectedLoadKey(null);
  }

  return (
    <>
      <Sheet open={loadSheetOpen} onOpenChange={handleSheetOpenChange}>
        <main
          className={`app-shell scene-${activeScene} ${sentryCameraOn && intrusion ? 'is-alert' : ''}`}
          style={sceneLightingStyle}
        >
          <header className="topbar">
            <div className="brand-lockup">
              <img
                src="/brand/renogy-logo-dark.svg"
                alt="Renogy"
                className="brand-logo"
              />
              <span className="brand-divider" aria-hidden="true" />
              <div>
                <strong>ONE Vision</strong>
                <span>
                  {locale === 'en' ? 'Concept Experience' : '概念体验'}
                </span>
              </div>
            </div>
            <div className="trip-context">
              <MapPin aria-hidden="true" />
              <div>
                <span>
                  {locale === 'en'
                    ? 'Pine Lake · Site 07'
                    : '松湖营地 · 07号位'}
                </span>
                <small>
                  {locale === 'en'
                    ? 'Parked · Level complete'
                    : '已驻车 · 调平完成'}
                </small>
              </div>
            </div>
            <div className="top-actions">
              <span className="connection-pill">
                <Wifi aria-hidden="true" />{' '}
                {locale === 'en' ? 'Connected' : '已连接'}
              </span>
              <time>{formatSceneTime(current.time, locale)}</time>
              <button
                className="icon-button language-button"
                onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
                aria-label={
                  locale === 'en' ? 'Switch to Chinese' : '切换到英文'
                }
              >
                <Languages aria-hidden="true" />
                <span>{locale === 'en' ? '中文' : 'EN'}</span>
              </button>
              <button
                className="icon-button reset-button"
                onClick={resetDemo}
                aria-label={
                  locale === 'en'
                    ? `Reset ${pick(current.name)} mode devices`
                    : `恢复${pick(current.name)}模式设备初始设置`
                }
              >
                <RotateCcw aria-hidden="true" />
                <span>{locale === 'en' ? 'Reset' : '重置'}</span>
              </button>
            </div>
          </header>

          <div className="dashboard">
            <div className="workspace-grid">
              <aside
                className={`panel energy-panel ${kitchenLoadWatts > 0 ? 'has-kitchen-load' : ''}`}
              >
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      {locale === 'en' ? 'ENERGY SYSTEM' : '能源系统'}
                    </span>
                    <h2>{locale === 'en' ? 'Energy flow' : '能量流'}</h2>
                    <span className="readonly-note">
                      {locale === 'en' ? 'View only' : '仅展示'}
                    </span>
                  </div>
                  <span
                    className={`healthy-badge ${kitchenLoadWatts > 0 ? 'is-managing-load' : ''}`}
                  >
                    <CircleDot aria-hidden="true" />{' '}
                    {kitchenLoadWatts > 0
                      ? locale === 'en'
                        ? 'Load management active'
                        : '负载调度中'
                      : locale === 'en'
                        ? 'Healthy'
                        : '正常'}
                  </span>
                </div>
                <div
                  className={`battery-summary ${batteryIsCharging ? 'is-charging' : 'is-discharging'}`}
                >
                  <div
                    className="battery-orbit"
                    aria-label={
                      locale === 'en'
                        ? 'Battery state of charge 82 percent'
                        : '电池电量82%'
                    }
                  >
                    <div className="battery-ring">
                      <div>
                        {batteryIsCharging ? (
                          <BatteryCharging aria-hidden="true" />
                        ) : (
                          <Battery aria-hidden="true" />
                        )}
                        <strong>
                          82<span>%</span>
                        </strong>
                        <small>
                          {locale === 'en' ? 'Battery' : '电池电量'}
                        </small>
                      </div>
                    </div>
                    <span className="orbit-dot" aria-hidden="true" />
                  </div>
                  <span
                    className="battery-flow-status"
                    role="status"
                    aria-atomic="true"
                    aria-label={
                      locale === 'en'
                        ? `RV load ${rvLoadValue}; battery ${batteryFlowLabel.toLowerCase()} at ${batteryFlowPower}`
                        : `房车负载${rvLoadValue}；电池${batteryFlowLabel}${batteryFlowPower}`
                    }
                  >
                    <span className="battery-flow-direction">
                      {batteryIsCharging ? (
                        <ArrowDown aria-hidden="true" />
                      ) : (
                        <ArrowUp aria-hidden="true" />
                      )}
                      {batteryFlowLabel}
                    </span>
                    <strong>{batteryFlowPower}</strong>
                  </span>
                </div>
                <div
                  className="energy-metrics"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <Metric
                    icon={Sun}
                    label={locale === 'en' ? 'Solar' : '太阳能'}
                    value={current.solar}
                    tone="cyan"
                  />
                  <Metric
                    icon={batteryIsCharging ? BatteryCharging : Battery}
                    label={
                      locale === 'en'
                        ? batteryIsCharging
                          ? 'Battery charging'
                          : 'Battery discharge'
                        : batteryIsCharging
                          ? '电池充电'
                          : '电池放电'
                    }
                    value={batteryFlowValue}
                    tone={batteryIsCharging ? 'green' : 'amber'}
                  />
                  <Metric
                    icon={Power}
                    label={locale === 'en' ? 'RV load' : '房车负载'}
                    value={rvLoadValue}
                    tone="violet"
                  />
                </div>
                <div
                  className={`flow-rail ${batteryIsCharging ? 'is-charging' : 'is-discharging'}`}
                  aria-hidden="true"
                >
                  <span className="flow-line" />
                  <span className="flow-pulse pulse-one" />
                  <span className="flow-pulse pulse-two" />
                </div>
                <div className="forecast-card">
                  <div className="forecast-copy">
                    <span>
                      {locale === 'en' ? 'Estimated runtime' : '预计续航时间'}
                    </span>
                    <strong>{estimatedRuntime}</strong>
                  </div>
                  <svg
                    viewBox="0 0 180 58"
                    role="img"
                    aria-label={
                      locale === 'en'
                        ? 'Projected battery curve'
                        : '预计电量曲线'
                    }
                  >
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0"
                          stopColor={batteryIsCharging ? '#24add3' : '#f0b766'}
                          stopOpacity=".38"
                        />
                        <stop
                          offset="1"
                          stopColor={batteryIsCharging ? '#24add3' : '#f0b766'}
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d={`${forecastCurvePath} L178 58 L2 58 Z`}
                      fill="url(#chartFill)"
                    />
                    <path
                      d={forecastCurvePath}
                      fill="none"
                      stroke={batteryIsCharging ? '#46c6df' : '#f0b766'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    className={`forecast-foot ${kitchenLoadWatts > 0 ? 'is-high-load' : ''}`}
                  >
                    {kitchenLoadWatts > 0 ? (
                      <CookingPot aria-hidden="true" />
                    ) : (
                      <Leaf aria-hidden="true" />
                    )}{' '}
                    {kitchenLoadWatts > 0
                      ? locale === 'en'
                        ? `Kitchen +${kitchenLoadWatts} W · ${batteryFlowLabel} ${batteryFlowPower}`
                        : `厨房 +${kitchenLoadWatts} W · 电池${batteryFlowLabel} ${batteryFlowPower}`
                      : locale === 'en'
                        ? 'Optimized for this stay'
                        : '已为本次驻留优化'}
                  </div>
                </div>
              </aside>

              <section className="hero-panel">
                <div className="hero-scene-bleed" aria-hidden="true">
                  <Image
                    src="/assets/rv-designer/cabin-background-extended.jpg"
                    alt=""
                    className="hero-scene-bleed-image"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 1040px) 50vw, 68vw"
                  />
                </div>
                <div className="hero-scene-canvas">
                  <Image
                    src="/assets/rv-designer/cabin-light-off.jpg"
                    alt={
                      locale === 'en'
                        ? 'Cutaway smart RV cabin with independently controlled physical appliances'
                        : '配备独立可控实物设备的智能房车剖面实景'
                    }
                    className="hero-image hero-image-light-off"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 1040px) 50vw, 68vw"
                  />
                  <Image
                    src="/assets/rv-designer/cabin-light-on.jpg"
                    alt=""
                    className="hero-image hero-image-light-on"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 1040px) 50vw, 68vw"
                    style={{ opacity: mainLightLevel }}
                  />
                  <div
                    className="rv-light-wash"
                    style={
                      {
                        '--light-level': mainLightLevel,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <div className="designer-shade-layer" aria-hidden="true">
                    <Image
                      src="/assets/rv-designer/shades-closed-off.png"
                      alt=""
                      className="designer-shade-image"
                      fill
                      sizes="(max-width: 1040px) 50vw, 68vw"
                      unoptimized
                      style={{
                        opacity: shadeClosedLevel * (1 - mainLightLevel),
                      }}
                    />
                    <Image
                      src="/assets/rv-designer/shades-closed-on.png"
                      alt=""
                      className="designer-shade-image"
                      fill
                      sizes="(max-width: 1040px) 50vw, 68vw"
                      unoptimized
                      style={{ opacity: shadeClosedLevel * mainLightLevel }}
                    />
                  </div>
                  <div
                    className="designer-device-layer"
                    style={
                      {
                        '--device-light-level': mainLightLevel,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  >
                    <span className="designer-device designer-device-climate">
                      {climateOn && airflowLevel > 0 && (
                        <span
                          className="designer-airflow"
                          style={
                            {
                              '--airflow-level': airflowLevel,
                            } as CSSProperties
                          }
                        >
                          <Image
                            src="/assets/rv-designer/airflow.png"
                            alt=""
                            fill
                            sizes="10vw"
                            unoptimized
                          />
                          <Image
                            src="/assets/rv-designer/airflow.png"
                            alt=""
                            fill
                            sizes="10vw"
                            unoptimized
                          />
                          <Image
                            src="/assets/rv-designer/airflow.png"
                            alt=""
                            fill
                            sizes="10vw"
                            unoptimized
                          />
                        </span>
                      )}
                      <Image
                        src={`/assets/rv-designer/climate-${climateOn ? 'on' : 'off'}.png`}
                        alt=""
                        fill
                        sizes="18vw"
                        unoptimized
                      />
                    </span>
                    <span className="designer-device designer-device-audio">
                      <Image
                        src={`/assets/rv-designer/audio-${audioOn ? 'on' : 'off'}.png`}
                        alt=""
                        fill
                        sizes="8vw"
                        unoptimized
                      />
                    </span>
                    <span className="designer-device designer-device-coffee">
                      <Image
                        src={`/assets/rv-designer/coffee-${coffeeOn ? 'on' : 'off'}.png`}
                        alt=""
                        fill
                        sizes="8vw"
                        unoptimized
                      />
                    </span>
                    {!tvOn && (
                      <span className="designer-device designer-device-tv">
                        <Image
                          src="/assets/rv-designer/tv-off.png"
                          alt=""
                          fill
                          sizes="8vw"
                          unoptimized
                        />
                      </span>
                    )}
                    <span className="designer-device designer-device-camera">
                      <Image
                        src={`/assets/rv-designer/camera-${cameraOn ? 'on' : 'off'}.png`}
                        alt=""
                        fill
                        sizes="8vw"
                        unoptimized
                      />
                    </span>
                    <span className="designer-device designer-device-computer">
                      <Image
                        src="/assets/rv-designer/computer.png"
                        alt=""
                        fill
                        sizes="8vw"
                        unoptimized
                      />
                    </span>
                    <span className="designer-device designer-device-humidifier">
                      {humidifierOn && mistLevel > 0 && (
                        <span
                          className="designer-humidifier-mist"
                          style={
                            {
                              '--mist-level': mistLevel,
                            } as CSSProperties
                          }
                        >
                          <Image
                            src="/assets/rv-designer/humidifier-mist.png"
                            alt=""
                            fill
                            sizes="5vw"
                            unoptimized
                          />
                          <Image
                            src="/assets/rv-designer/humidifier-mist.png"
                            alt=""
                            fill
                            sizes="5vw"
                            unoptimized
                          />
                        </span>
                      )}
                      <Image
                        src={`/assets/rv-designer/humidifier-${humidifierOn ? 'on' : 'off'}.png`}
                        alt=""
                        fill
                        sizes="6vw"
                        unoptimized
                      />
                    </span>
                  </div>
                </div>
                <div className="hero-vignette" aria-hidden="true" />
                <div className="hero-sheen" aria-hidden="true" />
                {tvOn && (
                  <div className="hero-scene-foreground" aria-hidden="true">
                    <span className="designer-device designer-device-tv designer-device-tv-luminous">
                      <Image
                        src="/assets/rv-designer/tv-on.png"
                        alt=""
                        fill
                        sizes="8vw"
                        unoptimized
                      />
                    </span>
                  </div>
                )}
                <div className="scene-story">
                  <div className="scene-story-meta">
                    <span className="eyebrow">
                      {locale === 'en'
                        ? `${current.name.en.toUpperCase()} MODE`
                        : `${current.name.zh}模式`}
                    </span>
                    <span className="device-interaction-hint">
                      <Hand aria-hidden="true" />
                      {locale === 'en'
                        ? 'Tap a device to adjust'
                        : '点击设备即可调节'}
                      <ChevronRight aria-hidden="true" />
                    </span>
                  </div>
                  <h1>{pick(current.kicker)}</h1>
                  <p>{pick(current.message)}</p>
                </div>
                <div className="hero-chips">
                  <span className={temperatureSensor.on ? '' : 'is-offline'}>
                    <Thermometer aria-hidden="true" />{' '}
                    {temperatureSensor.on
                      ? pick(temperatureSensor.value)
                      : locale === 'en'
                        ? 'Temperature offline'
                        : '温度传感器离线'}
                  </span>
                  <span className={airSensor.on ? '' : 'is-offline'}>
                    <Wind aria-hidden="true" />{' '}
                    {airSensor.on
                      ? pick(airSensor.value)
                      : locale === 'en'
                        ? 'Air sensor offline'
                        : '空气传感器离线'}
                  </span>
                  <span className={noiseSensor.on ? '' : 'is-offline'}>
                    <Waves aria-hidden="true" />{' '}
                    {noiseSensor.on
                      ? pick(noiseSensor.value)
                      : locale === 'en'
                        ? 'Noise sensor offline'
                        : '噪声传感器离线'}
                  </span>
                </div>
                <div className="hero-interaction-canvas">
                  <fieldset className="vehicle-load-layer">
                    <legend className="sr-only">
                      {locale === 'en' ? 'RV device controls' : '房车负载控制'}
                    </legend>
                    {cabinLoads.map((load) => {
                      const LoadIcon = load.icon;
                      const state = getLoadState(load);
                      return (
                        <button
                          key={`${activeScene}-${load.key}`}
                          className={`device-hotspot load-${load.key} ${state.on ? 'is-on' : 'is-off'}`}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => {
                            setSelectedLoadKey(load.key);
                            setLoadSheetOpen(true);
                          }}
                          aria-label={`${pick(load.name)}: ${pick(state.value)} · ${locale === 'en' ? 'Edit device settings' : '编辑设备设置'}`}
                        >
                          <span
                            className="actual-device-marker"
                            aria-hidden="true"
                          />
                          <span
                            className="device-hotspot-label"
                            aria-hidden="true"
                          >
                            <LoadIcon aria-hidden="true" />
                            <span>
                              <strong>{pick(load.name)}</strong>
                              <small>{pick(state.value)}</small>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </fieldset>
                </div>
                <div className="device-log-card">
                  <div className="device-log-icon">
                    <History aria-hidden="true" />
                  </div>
                  <div className="device-log-heading">
                    <small>
                      {locale === 'en' ? 'DEVICE ACTIVITY' : '设备动态'}
                    </small>
                    <strong>
                      {locale === 'en'
                        ? 'Status change log'
                        : '设备状态变更日志'}
                    </strong>
                  </div>
                  <ol
                    className="device-log-list"
                    aria-live="polite"
                    aria-label={
                      locale === 'en'
                        ? 'Recent device status changes'
                        : '最近设备状态变更'
                    }
                  >
                    {deviceLogs.slice(0, 3).map((entry, index) => (
                      <li
                        className={index === 0 ? 'is-latest' : ''}
                        key={entry.id}
                      >
                        <time>{entry.time}</time>
                        <span>
                          <strong>{pick(entry.device)}</strong>
                          <small>{pick(entry.detail)}</small>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <button
                    className="load-sheet-trigger"
                    onClick={() => setLogDialogOpen(true)}
                  >
                    <span>
                      {locale === 'en' ? 'View all logs' : '查看全部日志'}
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                {pendingScene && (
                  <div
                    className="activation-layer"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="activation-core">
                      <PreviewIcon aria-hidden="true" />
                      <span>{locale === 'en' ? 'Activating' : '正在启动'}</span>
                      <strong>
                        {pick(preview.name)} {locale === 'en' ? 'Mode' : '模式'}
                      </strong>
                      <div className="activation-progress">
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <aside className="panel systems-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      {securityPanelActive
                        ? locale === 'en'
                          ? sentryCameraOn
                            ? '360° SENTRY'
                            : 'CABIN CAMERA'
                          : sentryCameraOn
                            ? '360° 哨兵守护'
                            : '车内摄像头'
                        : locale === 'en'
                          ? 'SMART LIVING'
                          : '智能生活'}
                    </span>
                    <h2>
                      {securityPanelActive
                        ? locale === 'en'
                          ? sentryCameraOn
                            ? 'Security'
                            : 'Cabin monitoring'
                          : sentryCameraOn
                            ? '安防'
                            : '车内监控'
                        : locale === 'en'
                          ? 'Cabin systems'
                          : '舱内系统'}
                    </h2>
                  </div>
                  {securityPanelActive ? (
                    <ShieldCheck
                      className="panel-title-icon"
                      aria-hidden="true"
                    />
                  ) : (
                    <Armchair className="panel-title-icon" aria-hidden="true" />
                  )}
                </div>
                <div
                  className={
                    securityPanelActive
                      ? 'systems-panel-content is-security'
                      : 'systems-panel-content'
                  }
                >
                  {securityPanelActive ? (
                    <>
                      {sentryCameraOn && indoorCameraOn ? (
                        <div
                          className="sentry-view-switch"
                          role="tablist"
                          aria-label={
                            locale === 'en'
                              ? 'Security camera area'
                              : '安防摄像头区域'
                          }
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-label={
                              locale === 'en'
                                ? 'Show exterior camera feeds'
                                : '查看车外摄像头画面'
                            }
                            aria-selected={activeSecurityView === 'exterior'}
                            aria-controls="security-camera-feed"
                            className={
                              activeSecurityView === 'exterior'
                                ? 'is-active'
                                : ''
                            }
                            onClick={() => setSecurityView('exterior')}
                          >
                            <span>{locale === 'en' ? 'Exterior' : '车外'}</span>
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-label={
                              locale === 'en'
                                ? 'Show interior camera feed'
                                : '查看车内摄像头画面'
                            }
                            aria-selected={activeSecurityView === 'interior'}
                            aria-controls="security-camera-feed"
                            className={
                              activeSecurityView === 'interior'
                                ? 'is-active'
                                : ''
                            }
                            onClick={() => setSecurityView('interior')}
                          >
                            <span>{locale === 'en' ? 'Interior' : '车内'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="camera-control-source">
                          {activeSecurityView === 'exterior' ? (
                            <ScanLine aria-hidden="true" />
                          ) : (
                            <Camera aria-hidden="true" />
                          )}
                          <span>
                            <strong>
                              {activeSecurityView === 'exterior'
                                ? locale === 'en'
                                  ? 'Side-view mirror camera'
                                  : '外后视镜摄像头'
                                : locale === 'en'
                                  ? 'Cabin camera'
                                  : '车内摄像头'}
                            </strong>
                            <small>
                              {activeSecurityView === 'exterior'
                                ? locale === 'en'
                                  ? 'Controls four exterior feeds and Sentry Mode'
                                  : '控制车外四路画面与哨兵模式'
                                : locale === 'en'
                                  ? 'Controls the interior live view'
                                  : '控制车内实时画面'}
                            </small>
                          </span>
                        </div>
                      )}
                      {activeSecurityView === 'exterior' ? (
                        <figure
                          id="security-camera-feed"
                          className="sentry-camera-wall"
                          aria-label={
                            locale === 'en'
                              ? 'Four live cameras providing complete perimeter coverage'
                              : '四路实时摄像头，全方位覆盖房车周界'
                          }
                        >
                          {sentryCameras.map((camera) => {
                            const cameraAlert =
                              intrusion && camera.detectsIntrusion;
                            return (
                              <button
                                className={`sentry-camera camera-${camera.position} ${cameraAlert ? 'is-alert' : ''}`}
                                type="button"
                                key={camera.id}
                                onClick={() => setSelectedCameraId(camera.id)}
                                aria-label={`${locale === 'en' ? camera.label.en : camera.label.zh} · ${locale === 'en' ? 'Open enlarged live camera view' : '打开实时监控大画面'}`}
                              >
                                <Image
                                  className="sentry-camera-image"
                                  src="/assets/sentry-cameras.png"
                                  width={1024}
                                  height={682}
                                  sizes="150px"
                                  alt=""
                                />
                                <div
                                  className="camera-overlay"
                                  aria-hidden="true"
                                />
                                <div className="sentry-camera-topline">
                                  <span
                                    className={
                                      cameraAlert
                                        ? 'sentry-live is-alert'
                                        : 'sentry-live'
                                    }
                                  >
                                    <Radio aria-hidden="true" />{' '}
                                    {cameraAlert
                                      ? locale === 'en'
                                        ? 'ALERT'
                                        : '告警'
                                      : 'LIVE'}
                                  </span>
                                  <span>CAM {camera.id}</span>
                                </div>
                                {cameraAlert ? (
                                  <div className="sentry-detection">
                                    <span>
                                      {locale === 'en'
                                        ? 'PERSON · 98%'
                                        : '人员 · 98%'}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className="sentry-scan"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="sentry-camera-caption">
                                  <Camera aria-hidden="true" />{' '}
                                  {locale === 'en'
                                    ? camera.label.en
                                    : camera.label.zh}
                                </div>
                                <span
                                  className="sentry-expand-hint"
                                  aria-hidden="true"
                                >
                                  <Maximize2 />
                                </span>
                              </button>
                            );
                          })}
                        </figure>
                      ) : (
                        <figure
                          id="security-camera-feed"
                          className="sentry-camera-wall is-interior"
                          aria-label={
                            locale === 'en'
                              ? 'Live interior cabin camera'
                              : '车内实时摄像头画面'
                          }
                        >
                          <button
                            className="sentry-camera sentry-camera-interior"
                            type="button"
                            style={interiorCameraLightingStyle}
                            onClick={() => setSelectedCameraId(indoorCamera.id)}
                            aria-label={`${locale === 'en' ? indoorCamera.label.en : indoorCamera.label.zh} · ${locale === 'en' ? 'Open enlarged live camera view' : '打开实时监控大画面'}`}
                          >
                            <Image
                              className="sentry-interior-image"
                              src="/assets/sentry-cabin-camera.png"
                              alt=""
                              fill
                              sizes="300px"
                            />
                            <div
                              className="sentry-interior-light-wash"
                              aria-hidden="true"
                            />
                            <div
                              className="camera-overlay"
                              aria-hidden="true"
                            />
                            <div className="sentry-camera-topline">
                              <span className="sentry-live">
                                <Radio aria-hidden="true" /> LIVE
                              </span>
                              <span>CAM {indoorCamera.id}</span>
                            </div>
                            <div className="sentry-scan" aria-hidden="true" />
                            <div className="sentry-camera-caption">
                              <Camera aria-hidden="true" />{' '}
                              {locale === 'en'
                                ? indoorCamera.label.en
                                : indoorCamera.label.zh}
                            </div>
                            <span
                              className="sentry-expand-hint"
                              aria-hidden="true"
                            >
                              <Maximize2 />
                            </span>
                          </button>
                        </figure>
                      )}
                      {sentryCameraOn ? (
                        <>
                          <div
                            className={`security-status ${intrusion ? 'security-alert' : ''}`}
                          >
                            <div className="security-emblem">
                              {intrusion ? (
                                <ShieldAlert aria-hidden="true" />
                              ) : (
                                <Radar aria-hidden="true" />
                              )}
                            </div>
                            <strong className="security-status-label">
                              {locale === 'en' ? 'Sentry Mode' : '哨兵模式'}
                            </strong>
                            <div
                              className={
                                intrusion
                                  ? 'perimeter-orbit has-alert'
                                  : 'perimeter-orbit'
                              }
                              aria-hidden="true"
                            >
                              <span />
                              <i />
                              <i />
                              <i />
                              <i />
                            </div>
                          </div>
                          <div className="readonly-note">
                            {locale === 'en'
                              ? 'The side-view mirror camera controls exterior Sentry Mode'
                              : '外后视镜摄像头负责车外画面与哨兵模式'}
                          </div>
                          <div className="security-grid">
                            <SecurityItem
                              icon={ScanLine}
                              label={locale === 'en' ? 'Motion' : '移动侦测'}
                              state={
                                intrusion
                                  ? locale === 'en'
                                    ? 'Detected'
                                    : '已检测'
                                  : locale === 'en'
                                    ? 'Active'
                                    : '已开启'
                              }
                              alert={intrusion}
                            />
                            <SecurityItem
                              icon={Camera}
                              label={locale === 'en' ? 'Cameras' : '摄像头'}
                              state={
                                locale === 'en'
                                  ? `${onlineCameraCount} / ${onlineCameraCount} online`
                                  : `${onlineCameraCount} / ${onlineCameraCount} 在线`
                              }
                              alert={false}
                            />
                            <SecurityItem
                              icon={Siren}
                              label={locale === 'en' ? 'Siren' : '警报器'}
                              state={
                                intrusion
                                  ? locale === 'en'
                                    ? 'Active'
                                    : '已响起'
                                  : locale === 'en'
                                    ? 'Ready'
                                    : '待命'
                              }
                              alert={intrusion}
                            />
                          </div>
                          <button
                            className={
                              intrusion
                                ? 'alert-action dismiss-action'
                                : 'alert-action'
                            }
                            onClick={() => setIntrusion(!intrusion)}
                          >
                            {intrusion ? (
                              <X aria-hidden="true" />
                            ) : (
                              <ShieldAlert aria-hidden="true" />
                            )}
                            {intrusion
                              ? locale === 'en'
                                ? 'Resolve demo alert'
                                : '解除演示警报'
                              : locale === 'en'
                                ? 'Tap to simulate motion'
                                : '点击模拟移动入侵'}
                            <ChevronRight aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <div className="cabin-camera-status">
                          <Camera aria-hidden="true" />
                          <span>
                            <strong>
                              {locale === 'en'
                                ? 'Cabin camera live'
                                : '车内画面已开启'}
                            </strong>
                            <small>
                              {locale === 'en'
                                ? 'Interior view only · Exterior Sentry Mode is off'
                                : '仅显示车内画面 · 车外哨兵模式未开启'}
                            </small>
                          </span>
                        </div>
                      )}
                      <button
                        className="panel-loads-trigger"
                        onClick={() => setLoadSheetOpen(true)}
                      >
                        <Power aria-hidden="true" />
                        <span>
                          {locale === 'en'
                            ? `View all ${cabinLoads.length + sensorDevices.length} devices`
                            : `查看全部${cabinLoads.length + sensorDevices.length}项设备`}
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="climate-card">
                        <div>
                          <span>
                            {locale === 'en' ? 'Interior climate' : '舱内环境'}
                          </span>
                          <strong>
                            {temperatureSensor.on ? temperatureReading : '--'}
                            <small>
                              {temperatureSensor.on
                                ? '°C'
                                : locale === 'en'
                                  ? 'OFFLINE'
                                  : '离线'}
                            </small>
                          </strong>
                        </div>
                        <div
                          className={`climate-orbit ${climateOn ? '' : 'is-off'}`}
                        >
                          <Wind aria-hidden="true" />
                          <span />
                        </div>
                        <p>
                          {temperatureSensor.on && airSensor.on ? (
                            <Check aria-hidden="true" />
                          ) : (
                            <Radio aria-hidden="true" />
                          )}{' '}
                          {temperatureSensor.on && airSensor.on
                            ? locale === 'en'
                              ? 'Temperature and air quality sensors are online'
                              : '温度与空气质量传感器在线'
                            : locale === 'en'
                              ? 'One or more environmental sensors are offline'
                              : '环境传感器存在离线'}
                        </p>
                      </div>
                      <div className="active-load-heading">
                        <span>
                          {locale === 'en'
                            ? 'Device status · View only'
                            : '设备状态 · 仅展示'}
                        </span>
                        <strong>{activeLoads.length}</strong>
                      </div>
                      {panelActiveLoads.length ? (
                        <div className="device-list active-load-list">
                          {panelActiveLoads.map((load) => {
                            const DeviceIcon = load.icon;
                            const state = getLoadState(load);
                            return (
                              <div className="device-row" key={load.key}>
                                <span className="device-icon is-on">
                                  <DeviceIcon aria-hidden="true" />
                                </span>
                                <div>
                                  <strong>{pick(load.name)}</strong>
                                  <small>{pick(state.value)}</small>
                                </div>
                                <span className="device-state is-on">
                                  {locale === 'en' ? 'ON' : '开'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : activeLoads.length === 0 ? (
                        <div className="loads-empty">
                          <Power aria-hidden="true" />
                          <span>
                            {locale === 'en'
                              ? 'All cabin devices are offline'
                              : '所有舱内设备均已离线'}
                          </span>
                        </div>
                      ) : null}
                      <button
                        className="panel-loads-trigger"
                        onClick={() => setLoadSheetOpen(true)}
                      >
                        <Power aria-hidden="true" />
                        <span>
                          {locale === 'en'
                            ? `View all ${cabinLoads.length + sensorDevices.length} devices`
                            : `查看全部${cabinLoads.length + sensorDevices.length}项设备`}
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
                <button
                  className={
                    securityPanelActive
                      ? 'ai-insight security-ai-insight'
                      : 'ai-insight'
                  }
                  type="button"
                  onClick={() => setAiAdviceOpen(true)}
                  aria-haspopup="dialog"
                >
                  <Sparkles aria-hidden="true" />
                  <p>
                    <strong>
                      {locale === 'en'
                        ? 'RENOGY AI ENERGY ADVISOR'
                        : 'RENOGY AI 能源顾问'}
                    </strong>
                    <span>{aiSummary}</span>
                    <b>
                      {locale === 'en'
                        ? 'View personal energy plan'
                        : '查看个人能源计划'}{' '}
                      <ChevronRight aria-hidden="true" />
                    </b>
                  </p>
                </button>
              </aside>
            </div>

            <nav
              className="scene-dock"
              aria-label={locale === 'en' ? 'RV scenes' : '房车场景'}
            >
              <div className="scene-intro">
                <span className="eyebrow">
                  {locale === 'en' ? 'ONE-TOUCH SCENES' : '一键场景'}
                </span>
                <strong>
                  {locale === 'en'
                    ? 'Tap a scene to begin'
                    : '点击场景，一键联动'}
                </strong>
              </div>
              <div className="scene-buttons">
                {sceneOrder.map((key) => {
                  const scene = scenes[key];
                  const SceneIcon = scene.sceneIcon;
                  const selected = (pendingScene ?? activeScene) === key;
                  return (
                    <button
                      key={key}
                      className={
                        selected ? 'scene-button is-selected' : 'scene-button'
                      }
                      onClick={() => activateScene(key)}
                      aria-pressed={selected}
                    >
                      <span className="scene-button-icon">
                        <SceneIcon aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{pick(scene.name)}</strong>
                        <small>
                          {pendingScene === key
                            ? locale === 'en'
                              ? 'Activating…'
                              : '切换中…'
                            : selected
                              ? locale === 'en'
                                ? 'Active'
                                : '当前场景'
                              : locale === 'en'
                                ? 'Tap to activate'
                                : '点击切换'}
                        </small>
                      </span>
                      {selected ? (
                        <Check className="scene-check" aria-hidden="true" />
                      ) : (
                        <ChevronRight
                          className="scene-action-arrow"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                className={`efficiency-pill ${healthResultIsFresh ? `is-${activeHealthLevel}` : 'is-unchecked'}`}
                type="button"
                onClick={() => {
                  setEfficiencyScene(activeScene);
                  setHealthCheckPhase('scanning');
                  setEfficiencyOpen(true);
                }}
                aria-haspopup="dialog"
                aria-label={
                  locale === 'en'
                    ? 'Run a system energy health check'
                    : '开始系统能源体检'
                }
              >
                <ScanLine aria-hidden="true" />
                <div>
                  <strong>{locale === 'en' ? 'Checkup' : '系统体检'}</strong>
                  <small>
                    {healthResultIsFresh
                      ? pick(activeHealthTitle)
                      : locale === 'en'
                        ? 'Tap to check energy configuration'
                        : '点击检查能源配置'}
                  </small>
                </div>
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          </div>

          <div className="portrait-gate">
            <RotateCcw aria-hidden="true" />
            <h1>Renogy ONE Vision</h1>
            <p>
              {locale === 'en'
                ? 'Rotate your tablet to landscape for the full experience.'
                : '请将平板旋转至横屏以获得完整体验。'}
            </p>
          </div>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="load-sheet"
          >
            <div className="sheet-grabber" aria-hidden="true" />
            <SheetHeader className="load-sheet-header">
              <div>
                {selectedLoad && (
                  <button
                    className="sheet-back-button"
                    type="button"
                    onClick={() => setSelectedLoadKey(null)}
                  >
                    <ArrowLeft aria-hidden="true" />
                    {locale === 'en' ? 'All devices' : '全部设备'}
                  </button>
                )}
                <span className="eyebrow">
                  {selectedLoad
                    ? selectedLoad.kind === 'sensor'
                      ? locale === 'en'
                        ? 'LIVE MONITORING'
                        : '实时监测'
                      : locale === 'en'
                        ? 'DEVICE CONTROL'
                        : '设备控制'
                    : locale === 'en'
                      ? 'LIVE SCENE STATUS'
                      : '当前场景状态'}
                </span>
                <SheetTitle>
                  {selectedLoad ? (
                    pick(selectedLoad.name)
                  ) : (
                    <>
                      {pick(current.name)}{' '}
                      {locale === 'en'
                        ? 'Mode · All devices'
                        : '模式 · 全部设备'}
                    </>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedLoad
                    ? selectedLoad.kind === 'sensor'
                      ? locale === 'en'
                        ? 'Always-on sensing device · Read-only monitoring'
                        : '常驻感知设备 · 仅支持查看监测数据'
                      : locale === 'en'
                        ? 'Adjust this device without leaving the current scene'
                        : '调整设备后将立即回写当前场景'
                    : locale === 'en'
                      ? `${cabinLoads.length} loads · ${onlineSensorCount}/${sensorDevices.length} sensors online · Select a device for controls`
                      : `${cabinLoads.length}项负载 · ${onlineSensorCount}/${sensorDevices.length}个传感器在线 · 选择设备进入专属控制`}
                </SheetDescription>
              </div>
              <SheetClose
                className="sheet-close-button"
                aria-label={
                  locale === 'en' ? 'Close device status' : '关闭设备状态'
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
            </SheetHeader>
            {!selectedLoad && (
              <p className="sheet-interaction-hint">
                <Hand aria-hidden="true" />
                {locale === 'en'
                  ? 'Tap a device for settings · Use its switch for quick control · Sensors are view only'
                  : '点击设备调节参数 · 拨动开关快捷操作 · 传感器仅查看数据'}
              </p>
            )}
            {selectedLoad ? (
              <DeviceControlPanel
                device={selectedLoad}
                state={getLoadState(selectedLoad)}
                controls={deviceControls[selectedLoad.key] ?? {}}
                locale={locale}
                onToggle={() => toggleLoad(selectedLoad)}
                onPower={(on) => setLoadPower(selectedLoad, on)}
                onUpdate={(field, value) =>
                  updateDeviceControl(selectedLoad.key, field, value)
                }
              />
            ) : (
              <div
                className="sheet-load-grid"
                aria-label={
                  locale === 'en'
                    ? 'All RV device controls'
                    : '全部房车设备控制'
                }
              >
                {[...cabinLoads, ...sensorDevices].map((load) => {
                  const LoadIcon = load.icon;
                  const state = getLoadState(load);
                  const quickControlLocked =
                    !state.on &&
                    ((load.key === 'microwave' &&
                      deviceControls.microwave?.safetyLock === true) ||
                      (load.key === 'induction' &&
                        deviceControls.induction?.childLock === true));
                  const quickStateLabel = quickControlLocked
                    ? locale === 'en'
                      ? 'LOCKED'
                      : '已锁'
                    : load.key === 'shades'
                      ? state.on
                        ? locale === 'en'
                          ? 'OPEN'
                          : '开'
                        : locale === 'en'
                          ? 'CLOSED'
                          : '合'
                      : load.key === 'lock'
                        ? state.on
                          ? locale === 'en'
                            ? 'LOCKED'
                            : '已锁'
                          : locale === 'en'
                            ? 'UNLOCKED'
                            : '未锁'
                        : state.on
                          ? locale === 'en'
                            ? 'ON'
                            : '开'
                          : locale === 'en'
                            ? 'OFF'
                            : '关';
                  return (
                    <div
                      className={`sheet-load-card ${load.kind === 'sensor' ? 'is-sensor' : ''} ${state.on ? 'is-on' : 'is-off'}`}
                      key={load.key}
                    >
                      <button
                        className="sheet-card-detail"
                        type="button"
                        onClick={() => setSelectedLoadKey(load.key)}
                        aria-label={`${pick(load.name)} · ${pick(state.value)} · ${locale === 'en' ? 'Open controls' : '打开控制面板'}`}
                      >
                        <span className="sheet-load-icon">
                          <LoadIcon aria-hidden="true" />
                        </span>
                        <span className="sheet-load-copy">
                          <strong>{pick(load.name)}</strong>
                          <small>{pick(state.value)}</small>
                        </span>
                        <ChevronRight
                          className="sheet-card-chevron"
                          aria-hidden="true"
                        />
                      </button>
                      {load.kind === 'sensor' ? (
                        <span className="sheet-state-badge">
                          {locale === 'en' ? 'MONITORING' : '监测中'}
                        </span>
                      ) : (
                        <div className="sheet-quick-control">
                          <span aria-hidden="true">{quickStateLabel}</span>
                          <Switch
                            className="card-quick-switch"
                            checked={state.on}
                            disabled={quickControlLocked}
                            onCheckedChange={() => toggleLoad(load)}
                            aria-label={`${locale === 'en' ? 'Quick control' : '快捷控制'} · ${pick(load.name)} · ${quickStateLabel}${quickControlLocked ? ` · ${locale === 'en' ? 'Open settings to unlock' : '请进入设置解锁'}` : ''}`}
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
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="device-log-dialog" showCloseButton={false}>
          <DialogHeader className="device-log-dialog-header">
            <div>
              <span className="eyebrow">
                {locale === 'en' ? 'DEVICE ACTIVITY' : '设备动态'}
              </span>
              <DialogTitle>
                {locale === 'en'
                  ? 'Complete device status change log'
                  : '全部设备状态变更日志'}
              </DialogTitle>
              <DialogDescription>
                {locale === 'en'
                  ? `${deviceLogs.length} changes recorded in this demo session, newest first.`
                  : `本次演示已记录${deviceLogs.length}条状态变化，按最新时间排列。`}
              </DialogDescription>
            </div>
            <DialogClose
              className="device-log-dialog-close"
              aria-label={locale === 'en' ? 'Close logs' : '关闭日志'}
            >
              <X aria-hidden="true" />
            </DialogClose>
          </DialogHeader>
          <ol
            className="device-log-history"
            aria-label={
              locale === 'en'
                ? 'Complete device status change history'
                : '完整设备状态变更记录'
            }
          >
            {deviceLogs.map((entry, index) => (
              <li
                className={`${index === 0 ? 'is-latest' : ''} ${entry.actions?.length ? 'is-scene-event' : ''}`}
                key={entry.id}
              >
                <time>{entry.time}</time>
                <span className="device-log-history-copy">
                  <strong>{pick(entry.device)}</strong>
                  <small>{pick(entry.detail)}</small>
                </span>
                {index === 0 && (
                  <span className="device-log-latest-badge">
                    {locale === 'en' ? 'LATEST' : '最新'}
                  </span>
                )}
                {entry.actions?.length ? (
                  <ul
                    className="scene-log-actions"
                    aria-label={
                      locale === 'en'
                        ? `${pick(entry.device)} device actions`
                        : `${pick(entry.device)}设备联动明细`
                    }
                  >
                    {entry.actions.map((action, actionIndex) => (
                      <li key={`${entry.id}-${actionIndex}`}>
                        <strong>{pick(action.device)}</strong>
                        <span>{pick(action.detail)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
      <Dialog
        open={efficiencyOpen}
        onOpenChange={(open) => {
          setEfficiencyOpen(open);
          if (!open && healthCheckPhase === 'scanning') {
            setHealthCheckPhase('idle');
          }
        }}
      >
        <DialogContent className="efficiency-dialog" showCloseButton={false}>
          <DialogHeader className="efficiency-dialog-header">
            <div>
              <span className="eyebrow">
                {locale === 'en'
                  ? 'RENOGY SYSTEM DIAGNOSTICS'
                  : 'RENOGY 系统诊断'}
              </span>
              <DialogTitle>
                {locale === 'en' ? 'Energy system checkup' : '系统体检'}
              </DialogTitle>
              <DialogDescription>
                {locale === 'en'
                  ? 'Check the current power supply, energy storage, loads and scene automation.'
                  : '检查当前供电、储能、负载与场景联动配置。'}
              </DialogDescription>
            </div>
            <DialogClose
              className="efficiency-close"
              aria-label={
                locale === 'en' ? 'Close system checkup' : '关闭系统体检'
              }
            >
              <X aria-hidden="true" />
            </DialogClose>
          </DialogHeader>
          {healthCheckPhase === 'scanning' ? (
            <div className="health-scan" role="status" aria-live="polite">
              <div className="health-scan-visual" aria-hidden="true">
                <ScanLine />
                <span />
              </div>
              <div className="health-scan-copy">
                <span>{locale === 'en' ? 'CHECKING' : '正在体检'}</span>
                <h3>
                  {locale === 'en'
                    ? 'Analyzing your energy configuration'
                    : '正在分析系统能源配置'}
                </h3>
                <p>
                  {locale === 'en'
                    ? 'This only takes a moment. No device settings will be changed.'
                    : '预计仅需片刻，体检过程不会修改设备设置。'}
                </p>
              </div>
              <ol className="health-scan-list">
                {systemHealthChecks.map((check, index) => (
                  <li
                    key={check.en}
                    style={
                      { '--scan-delay': `${index * 0.18}s` } as CSSProperties
                    }
                  >
                    <span>
                      <Check aria-hidden="true" />
                    </span>
                    {pick(check)}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              <div
                className={`efficiency-overview health-result is-${selectedHealthLevel}`}
              >
                <div className="health-result-orbit">
                  <SelectedHealthIcon aria-hidden="true" />
                  <strong>{locale === 'en' ? 'Complete' : '体检完成'}</strong>
                  <small>{locale === 'en' ? '5 checks' : '5项已检查'}</small>
                </div>
                <div className="efficiency-explanation">
                  <span>
                    {locale === 'en'
                      ? `CURRENT CONFIGURATION · ${scenes[efficiencyScene].name.en.toUpperCase()} MODE`
                      : `${scenes[efficiencyScene].name.zh}模式 · 当前配置`}
                  </span>
                  <h3>{pick(selectedHealthTitle)}</h3>
                  <p>
                    {selectedHealthLevel === 'urgent'
                      ? hasAwaySecurityGap
                        ? locale === 'en'
                          ? 'Away protection is incomplete. Restore the required interior and exterior cameras immediately.'
                          : '外出防护已不完整，请立即恢复必需的车内外摄像头。'
                        : locale === 'en'
                          ? 'A power conflict or overload has been detected. Resolve the affected device configuration before continued use.'
                          : '检测到供电冲突或负载过载，请先处理相关设备配置再继续使用。'
                      : pick(dynamicHealthExplanation)}
                  </p>
                  <div className="health-result-meta">
                    <b>
                      {selectedHealthScore}
                      {locale === 'en' ? '/100' : '分'}
                    </b>
                    <span>
                      {selectedHealthIssueCount === 0
                        ? locale === 'en'
                          ? 'All 5 checks passed'
                          : '5项检查正常'
                        : selectedUrgentIssueCount > 0
                          ? locale === 'en'
                            ? `${selectedUrgentIssueCount} urgent ${selectedUrgentIssueCount === 1 ? 'issue' : 'issues'} · ${selectedImproveIssueCount} ${selectedImproveIssueCount === 1 ? 'improvement' : 'improvements'}`
                            : `${selectedUrgentIssueCount}项需立即处理 · ${selectedImproveIssueCount}项可优化`
                          : locale === 'en'
                            ? `${selectedHealthIssueCount} ${selectedHealthIssueCount === 1 ? 'improvement' : 'improvements'} available`
                            : `${selectedHealthIssueCount}项可优化`}
                    </span>
                  </div>
                </div>
              </div>
              <section
                className="efficiency-breakdown"
                aria-labelledby="efficiency-breakdown-title"
              >
                <div className="efficiency-section-heading">
                  <div>
                    <span className="eyebrow">
                      {locale === 'en' ? 'DIAGNOSTIC RESULTS' : '诊断结果'}
                    </span>
                    <h3 id="efficiency-breakdown-title">
                      {locale === 'en' ? 'Diagnostic checks' : '体检项目'}
                    </h3>
                  </div>
                  <small>
                    {locale === 'en' ? '5 checks completed' : '已完成5项检查'}
                  </small>
                </div>
                <div className="efficiency-factor-grid health-factor-grid">
                  {healthDiagnostics.map((diagnostic) => {
                    const actionable = diagnostic.level !== 'excellent';
                    const selected = diagnostic.id === selectedHealthCheckId;
                    return (
                      <button
                        type="button"
                        className={`efficiency-factor is-${diagnostic.level} ${selected ? 'is-selected' : ''}`}
                        key={diagnostic.id}
                        disabled={!actionable}
                        aria-expanded={actionable ? selected : undefined}
                        onClick={() =>
                          setSelectedHealthCheckId(
                            selected ? null : diagnostic.id,
                          )
                        }
                      >
                        <div>
                          <span>{pick(diagnostic.name)}</span>
                          <strong>
                            {diagnostic.level === 'excellent'
                              ? locale === 'en'
                                ? 'Normal'
                                : '正常'
                              : diagnostic.level === 'improve'
                                ? locale === 'en'
                                  ? 'Improve'
                                  : '可优化'
                                : locale === 'en'
                                  ? 'Fix now'
                                  : '立即处理'}
                          </strong>
                        </div>
                        <span className="efficiency-factor-bar">
                          <i style={{ width: `${diagnostic.score}%` }} />
                        </span>
                        <span
                          className={`health-factor-action ${actionable ? '' : 'is-placeholder'}`}
                          aria-hidden={!actionable}
                        >
                          {actionable ? (
                            <>
                              {locale === 'en'
                                ? 'View affected devices'
                                : '查看设备详情'}
                              <ChevronRight aria-hidden="true" />
                            </>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              {selectedHealthDiagnostic &&
              selectedHealthDiagnostic.level !== 'excellent' ? (
                <section
                  className={`health-issue-detail is-${selectedHealthDiagnostic.level}`}
                  aria-live="polite"
                >
                  <div className="health-issue-heading">
                    <div>
                      {selectedHealthDiagnostic.level === 'urgent' ? (
                        <ShieldAlert aria-hidden="true" />
                      ) : (
                        <Gauge aria-hidden="true" />
                      )}
                      <span>
                        <small>
                          {selectedHealthDiagnostic.level === 'urgent'
                            ? locale === 'en'
                              ? 'FIX IMMEDIATELY'
                              : '需立即处理'
                            : locale === 'en'
                              ? 'OPTIMIZATION DETAIL'
                              : '可优化详情'}
                        </small>
                        <strong>{pick(selectedHealthDiagnostic.name)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={
                        locale === 'en'
                          ? 'Close diagnostic detail'
                          : '收起诊断详情'
                      }
                      onClick={() => setSelectedHealthCheckId(null)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <div className="health-issue-device">
                    <span>
                      {locale === 'en' ? 'Affected devices' : '受影响设备'}
                    </span>
                    <strong>{pick(selectedHealthDiagnostic.device)}</strong>
                  </div>
                  <div className="health-issue-facts">
                    <div>
                      <span>
                        {locale === 'en' ? 'Current condition' : '当前情况'}
                      </span>
                      <p>{pick(selectedHealthDiagnostic.observed)}</p>
                    </div>
                    <div>
                      <span>
                        {locale === 'en' ? 'System impact' : '系统影响'}
                      </span>
                      <p>{pick(selectedHealthDiagnostic.impact)}</p>
                    </div>
                    <div className="health-issue-recommendation">
                      <span>
                        {locale === 'en' ? 'Recommended action' : '处理建议'}
                      </span>
                      <p>{pick(selectedHealthDiagnostic.recommendation)}</p>
                    </div>
                  </div>
                </section>
              ) : null}
              <div className="efficiency-detail-grid">
                <section className="efficiency-actions">
                  <span className="eyebrow">
                    {locale === 'en' ? 'PASSED CHECKS' : '已通过检查'}
                  </span>
                  {healthPassedActions.map((action) => (
                    <p key={action.en}>
                      <Check aria-hidden="true" />
                      {pick(action)}
                    </p>
                  ))}
                </section>
                <section
                  className={`efficiency-opportunity is-${selectedHealthLevel}`}
                >
                  {selectedHealthLevel === 'urgent' ? (
                    <ShieldAlert aria-hidden="true" />
                  ) : (
                    <Sparkles aria-hidden="true" />
                  )}
                  <div>
                    <span>
                      {selectedHealthLevel === 'urgent'
                        ? locale === 'en'
                          ? 'FIX NOW'
                          : '建议立即处理'
                        : locale === 'en'
                          ? 'IMPROVEMENT'
                          : '优化建议'}
                    </span>
                    <p>
                      {pick(
                        selectedHealthLevel === 'urgent' &&
                          urgentHealthRecommendation
                          ? urgentHealthRecommendation
                          : selectedEnergyInsight.opportunity,
                      )}
                    </p>
                  </div>
                </section>
              </div>
              <div className="health-result-footer">
                <p className="efficiency-model-note">
                  {locale === 'en'
                    ? 'Results are based on the current device state and simulated demo data.'
                    : '体检结果依据当前设备状态与模拟演示数据生成。'}
                </p>
                <button
                  type="button"
                  onClick={() => setHealthCheckPhase('scanning')}
                >
                  <ScanLine aria-hidden="true" />
                  {locale === 'en' ? 'Check again' : '重新体检'}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={aiAdviceOpen} onOpenChange={setAiAdviceOpen}>
        <DialogContent className="ai-advice-dialog" showCloseButton={false}>
          <DialogHeader className="efficiency-dialog-header">
            <div>
              <span className="eyebrow">
                {locale === 'en'
                  ? 'RENOGY AI ENERGY ADVISOR'
                  : 'RENOGY AI 能源顾问'}
              </span>
              <DialogTitle>
                {locale === 'en'
                  ? 'Your personal energy outlook'
                  : '你的个人能源预测'}
              </DialogTitle>
              <DialogDescription>
                {locale === 'en'
                  ? 'Based on 14 days of simulated habits: 2 meals, 1 movie and 8 hours of overnight comfort each day.'
                  : '依据模拟的近14天习惯：每天2顿饭、1部电影和8小时夜间舒适环境。'}
              </DialogDescription>
            </div>
            <DialogClose
              className="efficiency-close"
              aria-label={
                locale === 'en' ? 'Close AI energy plan' : '关闭AI能源计划'
              }
            >
              <X aria-hidden="true" />
            </DialogClose>
          </DialogHeader>
          <section
            className={`ai-plan-overview ${dailyRoutineSupported ? 'is-supported' : 'needs-action'}`}
          >
            <span className="ai-plan-status">
              <BatteryCharging aria-hidden="true" />
              {dailyRoutineSupported
                ? locale === 'en'
                  ? "TODAY'S ROUTINE IS COVERED"
                  : '今日习惯用能可支撑'
                : locale === 'en'
                  ? 'ACTION NEEDED'
                  : '需要调整'}
            </span>
            <h3>{aiSummary}</h3>
            <div className="ai-plan-numbers">
              <span>
                <small>{locale === 'en' ? 'Usable battery' : '可用电量'}</small>
                <strong>{remainingBatteryKwh.toFixed(1)} kWh</strong>
              </span>
              <span>
                <small>{locale === 'en' ? 'Typical day' : '日常用能'}</small>
                <strong>{habitEnergy.daily.toFixed(1)} kWh</strong>
              </span>
              <span>
                <small>
                  {locale === 'en' ? 'Live RV load' : '实时房车负载'}
                </small>
                <strong>{rvLoadValue}</strong>
              </span>
            </div>
          </section>
          <section
            className="ai-capacity-section"
            aria-labelledby="ai-capacity-title"
          >
            <div className="efficiency-section-heading">
              <div>
                <span className="eyebrow">
                  {locale === 'en' ? 'BATTERY CAPACITY' : '电池续航能力'}
                </span>
                <h3 id="ai-capacity-title">
                  {locale === 'en'
                    ? 'What your remaining battery can support'
                    : '剩余电量可支持'}
                </h3>
              </div>
              <small>
                {locale === 'en'
                  ? 'Each estimate shown separately'
                  : '各项为独立估算'}
              </small>
            </div>
            <div className="ai-capacity-grid">
              <article>
                <CookingPot aria-hidden="true" />
                <span>
                  <strong>{supportedMeals}</strong>
                  <small>{locale === 'en' ? 'meals' : '顿饭'}</small>
                </span>
                <p>
                  {locale === 'en'
                    ? 'Daily meal preparation estimate'
                    : '日常备餐用能估算'}
                </p>
              </article>
              <article>
                <Film aria-hidden="true" />
                <span>
                  <strong>{supportedMovies}</strong>
                  <small>{locale === 'en' ? 'movies' : '部电影'}</small>
                </span>
                <p>
                  {locale === 'en'
                    ? '2-hour cinema sessions'
                    : '每次2小时影院体验'}
                </p>
              </article>
              <article>
                <Moon aria-hidden="true" />
                <span>
                  <strong>{supportedNights}</strong>
                  <small>{locale === 'en' ? 'nights' : '晚'}</small>
                </span>
                <p>
                  {locale === 'en'
                    ? 'Air conditioner + humidifier + security'
                    : '空调、加湿与夜间安防'}
                </p>
              </article>
              <article>
                <Gauge aria-hidden="true" />
                <span>
                  <strong>{supportedRoutineDays}</strong>
                  <small>{locale === 'en' ? 'days' : '天'}</small>
                </span>
                <p>
                  {locale === 'en'
                    ? 'Your complete daily routine'
                    : '完整日常用能习惯'}
                </p>
              </article>
            </div>
          </section>
          <section className="ai-habit-plan">
            <div>
              <span className="eyebrow">
                {locale === 'en' ? 'LEARNED DAILY HABITS' : '已学习的每日习惯'}
              </span>
              <p>
                <CookingPot aria-hidden="true" />
                {locale === 'en' ? '2 meals' : '2顿饭'}
                <strong>1.3 kWh</strong>
              </p>
              <p>
                <Film aria-hidden="true" />
                {locale === 'en' ? '1 movie' : '1部电影'}
                <strong>1.6 kWh</strong>
              </p>
              <p>
                <Moon aria-hidden="true" />
                {locale === 'en'
                  ? '8 hours of overnight comfort'
                  : '8小时夜间舒适'}
                <strong>2.4 kWh</strong>
              </p>
            </div>
            <div className="ai-next-action">
              <Sparkles aria-hidden="true" />
              <div>
                <span>
                  {locale === 'en' ? 'RECOMMENDED NEXT ACTION' : '建议下一步'}
                </span>
                <p>{aiRecommendation}</p>
              </div>
            </div>
          </section>
          <p className="efficiency-model-note">
            {locale === 'en'
              ? 'AI estimates use simulated 14-day behavior, current device states and demo energy data. Activity estimates are alternatives, not cumulative.'
              : 'AI估算基于模拟的14天使用习惯、当前设备状态与演示能源数据；各活动数量为分别估算，不可累加。'}
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedCamera)}
        onOpenChange={(open) => {
          if (!open) setSelectedCameraId(null);
        }}
      >
        <DialogContent className="camera-dialog" showCloseButton={false}>
          {selectedCamera && (
            <>
              <DialogHeader className="camera-dialog-header">
                <div>
                  <span className="eyebrow">
                    {locale === 'en'
                      ? selectedCamera.scope === 'interior'
                        ? 'CABIN CAMERA'
                        : 'SIDE-VIEW MIRROR CAMERA'
                      : selectedCamera.scope === 'interior'
                        ? '车内摄像头'
                        : '外后视镜摄像头'}{' '}
                    · CAM {selectedCamera.id}
                  </span>
                  <DialogTitle>
                    {locale === 'en'
                      ? selectedCamera.label.en
                      : selectedCamera.label.zh}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCamera.scope === 'interior'
                      ? locale === 'en'
                        ? 'Live overview of the cabin and connected appliances.'
                        : '车内空间与联动负载的实时画面。'
                      : locale === 'en'
                        ? 'Exterior live view controlled by the camera mounted on the right mirror.'
                        : '由右侧外后视镜摄像头控制的车外实时画面。'}
                  </DialogDescription>
                </div>
                <DialogClose
                  className="efficiency-close"
                  aria-label={
                    locale === 'en' ? 'Close camera view' : '关闭摄像头画面'
                  }
                >
                  <X aria-hidden="true" />
                </DialogClose>
              </DialogHeader>
              <div
                className={`camera-dialog-feed camera-${selectedCamera.position} ${selectedCamera.scope === 'interior' ? 'is-interior-camera' : ''} ${intrusion && selectedCamera.detectsIntrusion ? 'is-alert' : ''}`}
                style={
                  selectedCamera.scope === 'interior'
                    ? interiorCameraLightingStyle
                    : undefined
                }
              >
                {selectedCamera.scope === 'interior' ? (
                  <Image
                    className="sentry-interior-image"
                    src="/assets/sentry-cabin-camera.png"
                    fill
                    sizes="(max-width: 760px) 92vw, 900px"
                    alt={`${locale === 'en' ? selectedCamera.label.en : selectedCamera.label.zh} ${locale === 'en' ? 'enlarged live camera view' : '实时监控放大画面'}`}
                  />
                ) : (
                  <Image
                    className="sentry-camera-image"
                    src="/assets/sentry-cameras.png"
                    width={1024}
                    height={682}
                    sizes="(max-width: 760px) 92vw, 900px"
                    alt={`${locale === 'en' ? selectedCamera.label.en : selectedCamera.label.zh} ${locale === 'en' ? 'enlarged live camera view' : '实时监控放大画面'}`}
                  />
                )}
                {selectedCamera.scope === 'interior' ? (
                  <div
                    className="sentry-interior-light-wash"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="camera-overlay" aria-hidden="true" />
                <div className="camera-dialog-topline">
                  <span
                    className={
                      intrusion && selectedCamera.detectsIntrusion
                        ? 'live-pill alert-pill'
                        : 'live-pill'
                    }
                  >
                    <Radio aria-hidden="true" />{' '}
                    {intrusion && selectedCamera.detectsIntrusion
                      ? locale === 'en'
                        ? 'ALERT'
                        : '告警'
                      : 'LIVE'}
                  </span>
                  <span>
                    CAM {selectedCamera.id} ·{' '}
                    {formatSceneTime(current.time, locale)}
                  </span>
                </div>
                {intrusion && selectedCamera.detectsIntrusion ? (
                  <div className="sentry-detection is-enlarged">
                    <span>
                      {locale === 'en'
                        ? 'PERSON DETECTED · 98%'
                        : '检测到人员 · 98%'}
                    </span>
                  </div>
                ) : (
                  <div className="sentry-scan" aria-hidden="true" />
                )}
                <div className="camera-dialog-caption">
                  <Camera aria-hidden="true" />
                  <strong>
                    {locale === 'en'
                      ? selectedCamera.label.en
                      : selectedCamera.label.zh}
                  </strong>
                  <span>
                    {selectedCamera.scope === 'interior'
                      ? locale === 'en'
                        ? 'Cabin camera'
                        : '车内摄像头'
                      : locale === 'en'
                        ? 'Right side-view mirror camera'
                        : '右侧外后视镜摄像头'}
                  </span>
                </div>
              </div>
              <div className="camera-dialog-status">
                <span>
                  <Radio aria-hidden="true" />
                  {locale === 'en' ? 'Live stream' : '实时画面'}
                </span>
                <span>
                  <Camera aria-hidden="true" />
                  {selectedCamera.scope === 'interior'
                    ? locale === 'en'
                      ? '1/1 cabin camera online'
                      : '1/1 车内摄像头在线'
                    : locale === 'en'
                      ? '4/4 exterior feeds online'
                      : '4/4 车外画面在线'}
                </span>
                <span>
                  <ShieldCheck aria-hidden="true" />
                  {locale === 'en' ? 'Continuous recording' : '持续录像'}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeviceControlPanel({
  device,
  state,
  controls,
  locale,
  onToggle,
  onPower,
  onUpdate,
}: {
  device: VisualLoad;
  state: LoadState;
  controls: Record<string, ControlValue>;
  locale: Locale;
  onToggle: () => void;
  onPower: (on: boolean) => void;
  onUpdate: (field: string, value: ControlValue) => void;
}) {
  const t = (en: string, zh: string) => (locale === 'en' ? en : zh);
  const numberValue = (field: string, fallback: number) =>
    Number(controls[field] ?? fallback);
  const stringValue = (field: string, fallback: string) =>
    String(controls[field] ?? fallback);
  const DeviceIcon = device.icon;

  if (device.kind === 'sensor') {
    const sensorMetrics =
      device.key === 'temperature-sensor'
        ? [
            [t('Current reading', '当前温度'), state.value[locale]],
            [t('Accuracy', '测量精度'), '±0.3°C'],
            [t('Sampling', '采样周期'), t('Every 5 seconds', '每 5 秒')],
            [t('Installed at', '安装位置'), t('Cabin ceiling', '舱内顶部')],
          ]
        : device.key === 'air-sensor'
          ? [
              [
                'CO₂',
                state.value[locale]
                  .match(/CO₂\s[\d]+\sppm/)?.[0]
                  .replace('CO₂ ', '') ?? '650 ppm',
              ],
              ['TVOC', '0.18 mg/m³'],
              ['PM2.5', '8 μg/m³'],
              [t('Sampling', '采样周期'), t('Every 10 seconds', '每 10 秒')],
            ]
          : [
              [t('Current level', '当前噪声'), state.value[locale]],
              [t('15-minute average', '15 分钟平均值'), '25 dB'],
              [t('Peak', '峰值'), '38 dB'],
              [t('Privacy', '隐私模式'), t('No audio stored', '不保存录音')],
            ];
    return (
      <section
        className="device-control-panel sensor-monitor"
        aria-label={`${device.name[locale]} ${t('monitoring details', '监测详情')}`}
      >
        <div className="device-control-summary">
          <span className="device-control-icon">
            <DeviceIcon aria-hidden="true" />
          </span>
          <div>
            <small>{t('SYSTEM MANAGED', '系统托管')}</small>
            <strong>{state.value[locale]}</strong>
            <span>
              {t('Online · Continuous monitoring', '在线 · 持续监测')}
            </span>
          </div>
          <span className="monitoring-badge">
            <Radio aria-hidden="true" />
            {t('MONITORING', '监测中')}
          </span>
        </div>
        <div className="sensor-metric-grid">
          {sensorMetrics.map(([label, value]) => (
            <div className="sensor-metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="sensor-readonly-note">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>{t('Always-on sensing', '常驻感知')}</strong>
            {t(
              'This sensor cannot be switched off from a scene. Maintenance and calibration are managed at system level.',
              '传感器不支持在场景中关闭，维护与校准由系统级统一管理。',
            )}
          </span>
        </div>
      </section>
    );
  }

  const controlBody = (() => {
    switch (device.key) {
      case 'climate':
        return (
          <>
            <SegmentedControl
              label={t('Operating mode', '运行模式')}
              options={['Auto', 'Cool', 'Fan', 'Sleep']}
              value={stringValue('mode', 'Auto')}
              locale={locale}
              onChange={(value) => onUpdate('mode', value)}
            />
            <RangeControl
              label={t('Target temperature', '目标温度')}
              value={numberValue('target', 23)}
              min={16}
              max={30}
              unit="°C"
              onChange={(value) => onUpdate('target', value)}
            />
            <SegmentedControl
              label={t('Fan speed', '风速')}
              options={['Auto', 'Low', 'Medium', 'High']}
              value={stringValue('fan', 'Auto')}
              locale={locale}
              onChange={(value) => onUpdate('fan', value)}
            />
          </>
        );
      case 'lights':
        return (
          <RangeControl
            label={t('Brightness', '亮度')}
            value={numberValue('brightness', 65)}
            min={1}
            max={100}
            unit="%"
            onChange={(value) => onUpdate('brightness', value)}
          />
        );
      case 'shades':
        return (
          <>
            <div className="control-group">
              <span className="control-label">
                {t('Quick position', '快捷位置')}
              </span>
              <div className="control-actions">
                <button
                  className={
                    numberValue('position', 0) === 100 ? 'is-selected' : ''
                  }
                  type="button"
                  onClick={() => {
                    onPower(true);
                    onUpdate('position', 100);
                  }}
                >
                  {t('Open', '全开')}
                </button>
                <button
                  className={
                    numberValue('position', 0) === 50 ? 'is-selected' : ''
                  }
                  type="button"
                  onClick={() => {
                    onPower(true);
                    onUpdate('position', 50);
                  }}
                >
                  {t('Half', '半开')}
                </button>
                <button
                  className={
                    numberValue('position', 0) === 0 ? 'is-selected' : ''
                  }
                  type="button"
                  onClick={() => {
                    onPower(false);
                    onUpdate('position', 0);
                  }}
                >
                  {t('Close', '关闭')}
                </button>
              </div>
            </div>
            <RangeControl
              label={t('Opening level', '开合度')}
              value={numberValue('position', 0)}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => onUpdate('position', value)}
            />
          </>
        );
      case 'tv':
        return (
          <>
            <SegmentedControl
              label={t('Input source', '输入源')}
              options={['Streaming', 'HDMI', 'TV']}
              value={stringValue('source', 'Streaming')}
              locale={locale}
              onChange={(value) => onUpdate('source', value)}
            />
            <SegmentedControl
              label={t('Picture preset', '画面模式')}
              options={['Cinema', 'Standard', 'Game']}
              value={stringValue('picture', 'Standard')}
              locale={locale}
              onChange={(value) => onUpdate('picture', value)}
            />
          </>
        );
      case 'microwave':
        return (
          <>
            <SegmentedControl
              label={t('Cooking program', '烹饪程序')}
              options={['Reheat', 'Defrost', 'Popcorn', 'Manual']}
              value={stringValue('program', 'Reheat')}
              locale={locale}
              onChange={(value) => onUpdate('program', value)}
            />
            <RangeControl
              label={t('Microwave power', '微波功率')}
              value={numberValue('power', 800)}
              min={200}
              max={1000}
              step={100}
              unit="W"
              onChange={(value) => onUpdate('power', value)}
            />
            <RangeControl
              label={t('Cook time', '加热时间')}
              value={numberValue('timer', 90)}
              min={30}
              max={600}
              step={30}
              unit="s"
              onChange={(value) => onUpdate('timer', value)}
            />
            <div className="control-group">
              <span className="control-label">
                {t('Safety lock', '安全锁')}
              </span>
              <div className="control-actions two-up">
                <button
                  className={controls.safetyLock === true ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onUpdate('safetyLock', true)}
                >
                  <Lock aria-hidden="true" />
                  {t('Locked', '已锁定')}
                </button>
                <button
                  className={controls.safetyLock !== true ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onUpdate('safetyLock', false)}
                >
                  <DoorClosed aria-hidden="true" />
                  {t('Unlocked', '已解锁')}
                </button>
              </div>
            </div>
            <div className="device-safety-note">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>{t('Manual start required', '必须手动启动')}</strong>
                {t(
                  'Scenes may prepare a preset or stop heating, but never start the microwave automatically. Door interlock: closed.',
                  '场景可准备预设或停止加热，但绝不会自动启动微波炉。门体联锁：已闭合。',
                )}
              </span>
            </div>
          </>
        );
      case 'induction':
        return (
          <>
            <SegmentedControl
              label={t('Cooking mode', '烹饪模式')}
              options={['Simmer', 'Boil', 'Fry']}
              value={stringValue('mode', 'Simmer')}
              locale={locale}
              onChange={(value) => onUpdate('mode', value)}
            />
            <RangeControl
              label={t('Heating power', '加热功率')}
              value={numberValue('power', 600)}
              min={300}
              max={1800}
              step={100}
              unit="W"
              onChange={(value) => onUpdate('power', value)}
            />
            <RangeControl
              label={t('Auto-off timer', '定时关闭')}
              value={numberValue('timer', 15)}
              min={0}
              max={60}
              step={5}
              unit="min"
              onChange={(value) => onUpdate('timer', value)}
            />
            <div className="control-group">
              <span className="control-label">{t('Child lock', '童锁')}</span>
              <div className="control-actions two-up">
                <button
                  className={controls.childLock === true ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onUpdate('childLock', true)}
                >
                  <Lock aria-hidden="true" />
                  {t('Locked', '已锁定')}
                </button>
                <button
                  className={controls.childLock !== true ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onUpdate('childLock', false)}
                >
                  <DoorClosed aria-hidden="true" />
                  {t('Unlocked', '已解锁')}
                </button>
              </div>
            </div>
            <div className="device-safety-note">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>
                  {t('Cookware detection active', '锅具检测已启用')}
                </strong>
                {t(
                  'A scene can switch off and lock the cooktop, but heating always requires a manual start.',
                  '场景可以关闭并锁定电磁炉，但加热始终需要用户手动启动。',
                )}
              </span>
            </div>
          </>
        );
      case 'humidifier':
        return (
          <>
            <RangeControl
              label={t('Target humidity', '目标湿度')}
              value={numberValue('targetHumidity', 48)}
              min={35}
              max={70}
              unit="%"
              onChange={(value) => onUpdate('targetHumidity', value)}
            />
            <SegmentedControl
              label={t('Humidification mode', '加湿模式')}
              options={['Auto', 'Quiet', 'Boost']}
              value={stringValue('mode', 'Auto')}
              locale={locale}
              onChange={(value) => onUpdate('mode', value)}
            />
          </>
        );
      case 'ambient': {
        const colors = [
          { key: 'Warm', hex: '#ffc680' },
          { key: 'Sunset', hex: '#ff8d68' },
          { key: 'Ocean', hex: '#62d5e8' },
          { key: 'Violet', hex: '#a78bfa' },
        ];
        return (
          <>
            <RangeControl
              label={t('Brightness', '亮度')}
              value={numberValue('brightness', 35)}
              min={1}
              max={100}
              unit="%"
              onChange={(value) => onUpdate('brightness', value)}
            />
            <div className="control-group">
              <span className="control-label">
                {t('Light color', '灯光颜色')}
              </span>
              <div className="color-presets">
                {colors.map((color) => (
                  <button
                    type="button"
                    key={color.key}
                    className={
                      stringValue('color', 'Warm') === color.key
                        ? 'is-selected'
                        : ''
                    }
                    aria-pressed={stringValue('color', 'Warm') === color.key}
                    onClick={() => onUpdate('color', color.key)}
                  >
                    <span style={{ background: color.hex }} />
                    {controlTextFor(color.key, locale)}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      }
      case 'audio':
        return (
          <>
            <RangeControl
              label={t('Volume', '音量')}
              value={numberValue('volume', 28)}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => onUpdate('volume', value)}
            />
            <SegmentedControl
              label={t('Sound profile', '声场模式')}
              options={['Immersive', 'Music', 'Night']}
              value={stringValue('profile', 'Immersive')}
              locale={locale}
              onChange={(value) => onUpdate('profile', value)}
            />
          </>
        );
      case 'inverter':
        return (
          <>
            <SegmentedControl
              label={t('Power strategy', '供电策略')}
              options={['Eco', 'Balanced', 'Performance', 'Silent']}
              value={stringValue('mode', 'Balanced')}
              locale={locale}
              onChange={(value) => onUpdate('mode', value)}
            />
            <RangeControl
              label={t('AC output limit', 'AC 输出上限')}
              value={numberValue('outputLimit', 1800)}
              min={300}
              max={3000}
              step={100}
              unit="W"
              onChange={(value) => onUpdate('outputLimit', value)}
            />
          </>
        );
      case 'lock':
        return (
          <>
            <div className="control-group">
              <span className="control-label">
                {t('Door status', '门锁状态')}
              </span>
              <div className="control-actions two-up">
                <button
                  className={state.on ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onPower(true)}
                >
                  <Lock aria-hidden="true" />
                  {t('Lock', '上锁')}
                </button>
                <button
                  className={!state.on ? 'is-selected' : ''}
                  type="button"
                  onClick={() => onPower(false)}
                >
                  <DoorClosed aria-hidden="true" />
                  {t('Unlock', '解锁')}
                </button>
              </div>
            </div>
            <SegmentedControl
              label={t('Auto-lock delay', '自动上锁延时')}
              options={['30 sec', '1 min', 'Off']}
              value={stringValue('autoLock', 'Off')}
              locale={locale}
              onChange={(value) => onUpdate('autoLock', value)}
            />
          </>
        );
      default:
        return (
          <div className="control-empty">
            {t('No additional controls', '暂无更多控制项')}
          </div>
        );
    }
  })();

  const hidesPower = device.key === 'shades' || device.key === 'lock';
  const powerBlocked =
    !state.on &&
    ((device.key === 'microwave' && controls.safetyLock === true) ||
      (device.key === 'induction' && controls.childLock === true));
  const powerLabel =
    device.key === 'microwave'
      ? state.on
        ? t('Stop heating', '停止加热')
        : powerBlocked
          ? t('Unlock first', '请先解锁')
          : t('Start heating', '开始加热')
      : device.key === 'induction'
        ? state.on
          ? t('Stop cooking', '停止烹饪')
          : powerBlocked
            ? t('Unlock first', '请先解锁')
            : t('Start cooking', '开始烹饪')
        : state.on
          ? t('Turn off', '关闭')
          : t('Turn on', '开启');
  const controlsAvailable =
    state.on ||
    hidesPower ||
    device.key === 'microwave' ||
    device.key === 'induction';
  return (
    <section
      className="device-control-panel"
      aria-label={`${device.name[locale]} ${t('controls', '控制')}`}
    >
      <div className="device-control-summary">
        <span className="device-control-icon">
          <DeviceIcon aria-hidden="true" />
        </span>
        <div>
          <small>{t('CURRENT STATE', '当前状态')}</small>
          <strong aria-live="polite">{state.value[locale]}</strong>
          <span>
            {t(
              'Changes apply immediately to this scene',
              '修改将立即应用到当前场景',
            )}
          </span>
        </div>
        {!hidesPower && (
          <button
            className={`device-power-button ${state.on ? 'is-on' : ''}`}
            type="button"
            aria-pressed={state.on}
            disabled={powerBlocked}
            onClick={onToggle}
          >
            <Power aria-hidden="true" />
            {powerLabel}
          </button>
        )}
      </div>
      <div
        className={`device-control-fields ${controlsAvailable ? '' : 'is-disabled'}`}
      >
        {controlBody}
      </div>
    </section>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  locale,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  locale: Locale;
  onChange: (value: string) => void;
}) {
  return (
    <div className="control-group">
      <span className="control-label">{label}</span>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={value === option ? 'is-selected' : ''}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {controlTextFor(option, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  gradient,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  gradient?: 'temperature';
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span className="control-label">
        {label}
        <strong>
          {value}
          {unit}
        </strong>
      </span>
      <input
        className={gradient === 'temperature' ? 'temperature-range' : ''}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-bounds">
        <small>
          {min}
          {unit}
        </small>
        <small>
          {max}
          {unit}
        </small>
      </span>
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="metric-row">
      <span className={`metric-icon metric-${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SecurityItem({
  icon: Icon,
  label,
  state,
  alert,
}: {
  icon: LucideIcon;
  label: string;
  state: string;
  alert: boolean;
}) {
  return (
    <div className={alert ? 'security-item item-alert' : 'security-item'}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{state}</strong>
    </div>
  );
}
