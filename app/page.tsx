'use client';

import {
  Armchair, ArrowDown, ArrowLeft, ArrowUp, Battery, BatteryCharging, Blinds, Camera, Check, ChevronRight, CircleDot,
  CookingPot, DoorClosed, Droplets, Film, Gauge, Hand, Languages, Lamp, Leaf, Lock, MapPin, Maximize2, Microwave, Moon,
  Power, Radar, Radio, RotateCcw, ScanLine, ShieldAlert, ShieldCheck, Siren, Snowflake,
  Sparkles, Sun, TentTree, Thermometer, Tv, Volume2, Waves, Wifi, Wind, X, Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

type Locale = 'en' | 'zh';
type SceneKey = 'camp' | 'away' | 'movie' | 'sleep';
type IconName = 'lamp' | 'climate' | 'tv' | 'audio' | 'humidifier' | 'inverter' | 'lock' | 'blinds';
type LoadKey = 'climate' | 'lights' | 'shades' | 'tv' | 'microwave' | 'induction' | 'humidifier' | 'ambient' | 'audio' | 'inverter' | 'lock' | 'temperature-sensor' | 'air-sensor' | 'noise-sensor';
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

const sentryCameras = [
  { id: '01', position: 'front', label: { en: 'Front approach', zh: '车头前方' }, detectsIntrusion: false },
  { id: '02', position: 'entry', label: { en: 'Entry side', zh: '车门侧' }, detectsIntrusion: true },
  { id: '03', position: 'rear', label: { en: 'Rear perimeter', zh: '车尾后方' }, detectsIntrusion: false },
  { id: '04', position: 'camp', label: { en: 'Camp side', zh: '营地侧' }, detectsIntrusion: false },
] as const;

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
      { en: 'Kitchen appliances ready', zh: '厨房电器已就绪' },
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
      { en: 'Climate and cooking loads off', zh: '空调及烹饪负载已关闭' },
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
      { en: 'Popcorn preset ready', zh: '爆米花预设已就绪' },
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
      { en: 'Lights and cooking loads off', zh: '灯光及烹饪负载已关闭' },
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

const energyInsights: Record<SceneKey, {
  score: number;
  grade: Localized;
  summary: Localized;
  explanation: Localized;
  opportunity: Localized;
  actions: Localized[];
  factors: { name: Localized; weight: number; score: number }[];
}> = {
  camp: {
    score: 91, grade: { en: 'Excellent', zh: '优秀' },
    summary: { en: 'Comfort and charging are well balanced', zh: '舒适体验与充电效率保持均衡' },
    explanation: { en: 'Strong solar input covers the active cabin loads and still leaves surplus energy for the battery.', zh: '太阳能输入能够覆盖当前舱内负载，并保留余量为电池充电。' },
    opportunity: { en: 'Run high-power cooking while solar input is strongest to protect battery range.', zh: '建议在太阳能输入最强时使用高功率烹饪设备，以保护电池续航。' },
    actions: [{ en: 'Solar surplus is charging the battery', zh: '太阳能余量正在为电池充电' }, { en: 'Kitchen appliances await manual start', zh: '厨房电器等待手动启动' }, { en: 'Inverter uses Balanced mode', zh: '逆变器运行于均衡模式' }],
    factors: [{ name: { en: 'Load scheduling', zh: '负载调度' }, weight: 35, score: 92 }, { name: { en: 'Standby control', zh: '待机管理' }, weight: 25, score: 88 }, { name: { en: 'Power conversion', zh: '电能转换' }, weight: 25, score: 94 }, { name: { en: 'Renewable use', zh: '清洁能源利用' }, weight: 15, score: 88 }],
  },
  away: {
    score: 97, grade: { en: 'Optimal', zh: '卓越' },
    summary: { en: 'Only protection and essential systems remain active', zh: '仅保留安防和必要系统运行' },
    explanation: { en: 'Comfort loads are suspended while solar generation is prioritized for battery recovery.', zh: '舒适类负载已暂停，太阳能优先用于补充电池续航。' },
    opportunity: { en: 'This scene is already near its practical efficiency limit.', zh: '该场景已接近当前配置下的最佳能效。' },
    actions: [{ en: 'Cooking appliances are safely isolated', zh: '烹饪设备已安全断电' }, { en: 'Solar charging has priority', zh: '太阳能充电处于优先级' }, { en: 'Inverter is in Eco mode', zh: '逆变器已进入节能模式' }],
    factors: [{ name: { en: 'Load scheduling', zh: '负载调度' }, weight: 35, score: 99 }, { name: { en: 'Standby control', zh: '待机管理' }, weight: 25, score: 98 }, { name: { en: 'Power conversion', zh: '电能转换' }, weight: 25, score: 94 }, { name: { en: 'Renewable use', zh: '清洁能源利用' }, weight: 15, score: 96 }],
  },
  movie: {
    score: 86, grade: { en: 'Good', zh: '良好' },
    summary: { en: 'Immersive comfort uses more available energy', zh: '沉浸体验正在使用更多可用能源' },
    explanation: { en: 'Entertainment, spatial audio and performance power are active together while solar input is limited.', zh: '影音、空间音响和性能供电同时运行，且当前太阳能输入有限。' },
    opportunity: { en: 'Returning the inverter to Balanced mode after the movie could recover 5 points.', zh: '观影结束后将逆变器恢复至均衡模式，预计可提升5分。' },
    actions: [{ en: 'Microwave popcorn preset awaits confirmation', zh: '微波炉爆米花预设等待手动确认' }, { en: 'Ambient lighting is limited to 30%', zh: '氛围灯限制在30%' }, { en: 'Cooking never auto-starts from a scene', zh: '场景不会自动启动烹饪' }],
    factors: [{ name: { en: 'Load scheduling', zh: '负载调度' }, weight: 35, score: 84 }, { name: { en: 'Standby control', zh: '待机管理' }, weight: 25, score: 85 }, { name: { en: 'Power conversion', zh: '电能转换' }, weight: 25, score: 92 }, { name: { en: 'Renewable use', zh: '清洁能源利用' }, weight: 15, score: 82 }],
  },
  sleep: {
    score: 94, grade: { en: 'Excellent', zh: '优秀' },
    summary: { en: 'Quiet comfort runs with tightly managed power', zh: '静音舒适体验正在精细控制能耗' },
    explanation: { en: 'Lighting and entertainment loads are off while climate, humidity and security run in low-power modes.', zh: '照明与影音负载已关闭，空调、加湿和安防以低功耗模式运行。' },
    opportunity: { en: 'Raising the climate target by 1°C could add another 2 points.', zh: '将空调目标温度提高1°C，预计还可提升2分。' },
    actions: [{ en: 'All cooking appliances are locked off', zh: '全部烹饪设备已锁定关闭' }, { en: 'Inverter uses Silent mode', zh: '逆变器运行于静音模式' }, { en: 'Night comfort loads are coordinated', zh: '夜间舒适负载已协同调度' }],
    factors: [{ name: { en: 'Load scheduling', zh: '负载调度' }, weight: 35, score: 96 }, { name: { en: 'Standby control', zh: '待机管理' }, weight: 25, score: 92 }, { name: { en: 'Power conversion', zh: '电能转换' }, weight: 25, score: 94 }, { name: { en: 'Renewable use', zh: '清洁能源利用' }, weight: 15, score: 92 }],
  },
};

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
    key: 'microwave', icon: Microwave, name: { en: 'Microwave', zh: '微波炉' },
    states: {
      camp: { on: false, value: { en: 'Ready · Reheat', zh: '待启动 · 加热' } },
      away: { on: false, value: { en: 'Safety off', zh: '安全断电' } },
      movie: { on: false, value: { en: 'Popcorn preset', zh: '爆米花预设' } },
      sleep: { on: false, value: { en: 'Night lock', zh: '夜间锁定' } },
    },
  },
  {
    key: 'induction', icon: CookingPot, name: { en: 'Induction cooktop', zh: '电磁炉' },
    states: {
      camp: { on: false, value: { en: 'Ready · Simmer', zh: '待启动 · 慢炖' } },
      away: { on: false, value: { en: 'Safety off', zh: '安全断电' } },
      movie: { on: false, value: { en: 'Safety off', zh: '安全断电' } },
      sleep: { on: false, value: { en: 'Night lock', zh: '夜间锁定' } },
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
  microwave: { on: { en: 'Reheat · 800 W', zh: '加热 · 800 W' }, off: { en: 'Ready · Manual start', zh: '待启动 · 手动确认' } },
  induction: { on: { en: 'Simmer · 600 W', zh: '慢炖 · 600 W' }, off: { en: 'Safety off', zh: '安全关闭' } },
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
  Reheat: { en: 'Reheat', zh: '加热' }, Defrost: { en: 'Defrost', zh: '解冻' }, Popcorn: { en: 'Popcorn', zh: '爆米花' }, Manual: { en: 'Manual', zh: '手动' },
  Simmer: { en: 'Simmer', zh: '慢炖' }, Boil: { en: 'Boil', zh: '烧水' }, Fry: { en: 'Fry', zh: '煎炒' },
  '30 sec': { en: '30 sec', zh: '30秒' }, '1 min': { en: '1 min', zh: '1分钟' }, Off: { en: 'Off', zh: '关闭' },
};

const controlTextFor = (value: string, locale: Locale) => controlLabels[value]?.[locale] ?? value;

function createSceneControls(scene: SceneKey): DeviceControls {
  const presets = {
    camp: { climateMode: 'Auto', target: 23, fan: 'Auto', main: 65, cct: 3200, shade: 100, humid: 48, ambient: 35, ambientColor: 'Warm', volume: 28, audio: 'Immersive', inverter: 'Balanced', microwaveProgram: 'Reheat', microwavePower: 800, microwaveTimer: 90, microwaveLock: false, inductionMode: 'Simmer', inductionPower: 600, inductionTimer: 15, inductionLock: false },
    away: { climateMode: 'Auto', target: 27, fan: 'Low', main: 0, cct: 3200, shade: 0, humid: 45, ambient: 0, ambientColor: 'Warm', volume: 0, audio: 'Night', inverter: 'Eco', microwaveProgram: 'Reheat', microwavePower: 600, microwaveTimer: 60, microwaveLock: true, inductionMode: 'Simmer', inductionPower: 600, inductionTimer: 10, inductionLock: true },
    movie: { climateMode: 'Cool', target: 22, fan: 'Low', main: 0, cct: 3000, shade: 0, humid: 48, ambient: 30, ambientColor: 'Violet', volume: 42, audio: 'Immersive', inverter: 'Performance', microwaveProgram: 'Popcorn', microwavePower: 900, microwaveTimer: 150, microwaveLock: false, inductionMode: 'Simmer', inductionPower: 500, inductionTimer: 10, inductionLock: true },
    sleep: { climateMode: 'Sleep', target: 24, fan: 'Low', main: 0, cct: 2700, shade: 0, humid: 48, ambient: 15, ambientColor: 'Warm', volume: 0, audio: 'Night', inverter: 'Silent', microwaveProgram: 'Reheat', microwavePower: 600, microwaveTimer: 60, microwaveLock: true, inductionMode: 'Simmer', inductionPower: 500, inductionTimer: 10, inductionLock: true },
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
    microwave: { program: presets.microwaveProgram, power: presets.microwavePower, timer: presets.microwaveTimer, doorClosed: true, safetyLock: presets.microwaveLock },
    induction: { mode: presets.inductionMode, power: presets.inductionPower, timer: presets.inductionTimer, childLock: presets.inductionLock },
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
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [efficiencyOpen, setEfficiencyOpen] = useState(false);
  const [efficiencyScene, setEfficiencyScene] = useState<SceneKey>('camp');
  const [deviceControls, setDeviceControls] = useState<DeviceControls>(() => createSceneControls('camp'));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = scenes[activeScene];
  const activeEnergyInsight = energyInsights[activeScene];
  const selectedEnergyInsight = energyInsights[efficiencyScene];
  const preview = scenes[pendingScene ?? activeScene];
  const PreviewIcon = preview.sceneIcon;
  const pick = (value: Localized) => value[locale];
  const getLoadState = (load: VisualLoad, scene: SceneKey = activeScene): LoadState => {
    const override = loadOverrides[scene]?.[load.key];
    const base = typeof override !== 'boolean'
      ? load.states[scene]
      : override && load.kind === 'sensor'
        ? load.states[scene]
        : { on: override, value: manualLoadValues[load.key][override ? 'on' : 'off'] };
    const controls = deviceControls[load.key] ?? {};
    const localized = (en: string, zh: string, on = true): LoadState => ({ on, value: { en, zh } });
    if (!base.on || load.kind === 'sensor') {
      if (load.key === 'microwave' && controls.safetyLock === false) {
        return localized(`Ready · ${controlTextFor(String(controls.program), 'en')}`, `待启动 · ${controlTextFor(String(controls.program), 'zh')}`, false);
      }
      if (load.key === 'induction' && controls.childLock === false) {
        return localized(`Ready · ${controlTextFor(String(controls.mode), 'en')}`, `待启动 · ${controlTextFor(String(controls.mode), 'zh')}`, false);
      }
      return base;
    }
    switch (load.key) {
      case 'climate': return localized(`${controlTextFor(String(controls.mode), 'en')} · ${controls.target}°C`, `${controlTextFor(String(controls.mode), 'zh')} · ${controls.target}°C`);
      case 'lights': return localized(`${Number(controls.colorTemperature) <= 3300 ? 'Warm' : Number(controls.colorTemperature) >= 5000 ? 'Cool' : 'Neutral'} · ${controls.brightness}%`, `${Number(controls.colorTemperature) <= 3300 ? '暖光' : Number(controls.colorTemperature) >= 5000 ? '冷光' : '中性光'} · ${controls.brightness}%`);
      case 'shades': return Number(controls.position) === 100 ? localized('Open', '已打开') : Number(controls.position) === 0 ? localized('Closed', '已关闭') : localized(`${controls.position}% open`, `开启${controls.position}%`);
      case 'tv': return localized(`${controlTextFor(String(controls.source), 'en')} · On`, `${controlTextFor(String(controls.source), 'zh')} · 已开启`);
      case 'humidifier': return localized(`${controlTextFor(String(controls.mode), 'en')} · ${controls.targetHumidity}%`, `${controlTextFor(String(controls.mode), 'zh')} · ${controls.targetHumidity}%`);
      case 'ambient': return localized(`${controlTextFor(String(controls.color), 'en')} · ${controls.brightness}%`, `${controlTextFor(String(controls.color), 'zh')} · ${controls.brightness}%`);
      case 'audio': return localized(`${controlTextFor(String(controls.profile), 'en')} · ${controls.volume}%`, `${controlTextFor(String(controls.profile), 'zh')} · ${controls.volume}%`);
      case 'inverter': return localized(controlTextFor(String(controls.mode), 'en'), controlTextFor(String(controls.mode), 'zh'));
      case 'microwave': {
        const seconds = Number(controls.timer ?? 90);
        const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        return localized(`${controlTextFor(String(controls.program), 'en')} · ${controls.power} W · ${time}`, `${controlTextFor(String(controls.program), 'zh')} · ${controls.power} W · ${time}`);
      }
      case 'induction': return localized(`${controlTextFor(String(controls.mode), 'en')} · ${controls.power} W`, `${controlTextFor(String(controls.mode), 'zh')} · ${controls.power} W`);
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
  const microwaveOn = getLoadByKey('microwave').on;
  const inductionOn = getLoadByKey('induction').on;
  const microwavePower = microwaveOn ? Number(deviceControls.microwave?.power ?? 800) : 0;
  const inductionPower = inductionOn ? Number(deviceControls.induction?.power ?? 600) : 0;
  const kitchenLoadWatts = microwavePower + inductionPower;
  const rvLoadWatts = Number.parseFloat(current.load) + kitchenLoadWatts;
  const rvLoadValue = `${Math.round(rvLoadWatts)} W`;
  const batteryFlowKw = Math.round((Number.parseFloat(current.batteryFlow) - kitchenLoadWatts / 1000) * 100) / 100;
  const batteryIsCharging = batteryFlowKw >= 0;
  const batteryFlowPower = `${Math.abs(batteryFlowKw).toFixed(2)} kW`;
  const batteryFlowValue = `${batteryIsCharging ? '+' : '-'}${batteryFlowPower}`;
  const batteryFlowLabel = batteryIsCharging
    ? (locale === 'en' ? 'Charging' : '充电中')
    : (locale === 'en' ? 'Discharging' : '放电中');
  const estimatedRuntime = kitchenLoadWatts === 0 || batteryIsCharging
    ? current.runtime
    : `${Math.max(1, Math.floor(9.8 / Math.abs(batteryFlowKw)))} h`;
  const forecastCurvePath = batteryIsCharging
    ? 'M2 49 C28 45 31 32 55 35 S84 16 108 22 S145 8 178 13'
    : 'M2 11 C28 14 38 22 58 20 S91 33 112 31 S149 46 178 49';
  const temperatureSensor = getLoadByKey('temperature-sensor');
  const airSensor = getLoadByKey('air-sensor');
  const noiseSensor = getLoadByKey('noise-sensor');
  const onlineSensorCount = sensorDevices.filter(load => getLoadState(load).on).length;
  const temperatureReading = pick(temperatureSensor.value).replace('°C', '');
  const selectedLoad = selectedLoadKey ? visualLoads.find(load => load.key === selectedLoadKey) ?? null : null;
  const selectedCamera = selectedCameraId ? sentryCameras.find(camera => camera.id === selectedCameraId) ?? null : null;

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
    setSelectedCameraId(null);
    setIntrusion(false);
    setPendingScene(key);
    timer.current = setTimeout(() => { setActiveScene(key); setPendingScene(null); }, 980);
  }

  function resetDemo() {
    if (timer.current) clearTimeout(timer.current);
    setPendingScene(null); setIntrusion(false); setActiveScene('camp'); setLoadOverrides({}); setDeviceControls(createSceneControls('camp')); setSelectedLoadKey(null); setSelectedCameraId(null); setLoadSheetOpen(false); setEfficiencyOpen(false); setEfficiencyScene('camp');
  }

  function toggleLoad(load: VisualLoad) {
    if (load.kind === 'sensor') return;
    const next = !getLoadState(load).on;
    if (load.key === 'microwave' && next && deviceControls.microwave?.safetyLock === true) return;
    if (load.key === 'induction' && next && deviceControls.induction?.childLock === true) return;
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
    if (load.key === 'microwave' && on && deviceControls.microwave?.safetyLock === true) return;
    if (load.key === 'induction' && on && deviceControls.induction?.childLock === true) return;
    setLoadOverrides(previous => ({ ...previous, [activeScene]: { ...previous[activeScene], [load.key]: on } }));
  }

  function updateDeviceControl(key: LoadKey, field: string, value: ControlValue) {
    setDeviceControls(previous => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
    if (key === 'shades' && field === 'position') {
      const opened = Number(value) > 0;
      const load = visualLoads.find(item => item.key === key)!;
      setLoadPower(load, opened);
    }
    if (key === 'induction' && field === 'childLock' && Boolean(value)) {
      const load = visualLoads.find(item => item.key === key)!;
      setLoadPower(load, false);
    }
    if (key === 'microwave' && field === 'safetyLock' && Boolean(value)) {
      const load = visualLoads.find(item => item.key === key)!;
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
          <button className="icon-button reset-button" onClick={resetDemo} aria-label={locale === 'en' ? 'Reset demo' : '重置演示'}><RotateCcw aria-hidden="true" /><span>{locale === 'en' ? 'Reset' : '重置'}</span></button>
        </div>
      </header>

      <div className="dashboard">
        <div className="workspace-grid">
          <aside className="panel energy-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">{locale === 'en' ? 'ENERGY SYSTEM' : '能源系统'}</span><h2>{locale === 'en' ? 'Power flow' : '能量流'}</h2><span className="readonly-note">{locale === 'en' ? 'View only' : '仅展示'}</span></div>
              <span className="healthy-badge"><CircleDot aria-hidden="true" /> {locale === 'en' ? 'Healthy' : '正常'}</span>
            </div>
            <div className={`battery-summary ${batteryIsCharging ? 'is-charging' : 'is-discharging'}`}>
            <div className="battery-orbit" aria-label={locale === 'en' ? 'Battery state of charge 82 percent' : '电池电量82%'}>
              <div className="battery-ring"><div>{batteryIsCharging ? <BatteryCharging aria-hidden="true" /> : <Battery aria-hidden="true" />}<strong>82<span>%</span></strong><small>{locale === 'en' ? 'Battery' : '电池电量'}</small></div></div>
              <span className="orbit-dot" aria-hidden="true" />
            </div>
              <span className="battery-flow-status" role="status" aria-atomic="true" aria-label={locale === 'en' ? `RV load ${rvLoadValue}; battery ${batteryFlowLabel.toLowerCase()} at ${batteryFlowPower}` : `房车负载${rvLoadValue}；电池${batteryFlowLabel}${batteryFlowPower}`}><span className="battery-flow-direction">{batteryIsCharging ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}{batteryFlowLabel}</span><strong>{batteryFlowPower}</strong></span>
            </div>
            <div className="energy-metrics">
              <Metric icon={Sun} label={locale === 'en' ? 'Solar' : '太阳能'} value={current.solar} tone="cyan" />
              <Metric icon={batteryIsCharging ? BatteryCharging : Battery} label={locale === 'en' ? (batteryIsCharging ? 'Battery charging' : 'Battery discharge') : (batteryIsCharging ? '电池充电' : '电池放电')} value={batteryFlowValue} tone={batteryIsCharging ? 'green' : 'amber'} />
              <Metric icon={Power} label={locale === 'en' ? 'RV load' : '房车负载'} value={rvLoadValue} tone="violet" />
            </div>
            <div className={`flow-rail ${batteryIsCharging ? 'is-charging' : 'is-discharging'}`} aria-hidden="true"><span className="flow-line" /><span className="flow-pulse pulse-one" /><span className="flow-pulse pulse-two" /></div>
            <div className="forecast-card">
              <div className="forecast-copy"><span>{locale === 'en' ? 'Estimated autonomy' : '预计续航'}</span><strong>{estimatedRuntime}</strong></div>
              <svg viewBox="0 0 180 58" role="img" aria-label={locale === 'en' ? 'Projected battery curve' : '预计电量曲线'}>
                <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={batteryIsCharging ? '#24add3' : '#f0b766'} stopOpacity=".38" /><stop offset="1" stopColor={batteryIsCharging ? '#24add3' : '#f0b766'} stopOpacity="0" /></linearGradient></defs>
                <path d={`${forecastCurvePath} L178 58 L2 58 Z`} fill="url(#chartFill)" />
                <path d={forecastCurvePath} fill="none" stroke={batteryIsCharging ? '#46c6df' : '#f0b766'} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className={`forecast-foot ${kitchenLoadWatts > 0 ? 'is-high-load' : ''}`}>{kitchenLoadWatts > 0 ? <CookingPot aria-hidden="true" /> : <Leaf aria-hidden="true" />} {kitchenLoadWatts > 0 ? (locale === 'en' ? `Kitchen load +${kitchenLoadWatts} W included` : `已计入厨房负载 +${kitchenLoadWatts} W`) : (locale === 'en' ? 'Optimized for this stay' : '已为本次驻留优化')}</div>
            </div>
          </aside>

          <section className="hero-panel">
            <img src="/assets/rv-cabin-dusk.webp" alt={locale === 'en' ? 'Modern RV cabin at Pine Lake campsite' : '停在松湖营地的现代房车内部'} className="hero-image" />
            <div className="hero-vignette" aria-hidden="true" /><div className="hero-sheen" aria-hidden="true" />
            <div className="scene-story"><div className="scene-story-meta"><span className="eyebrow">{pick(current.name).toUpperCase()} MODE</span><span className="device-interaction-hint"><Hand aria-hidden="true" />{locale === 'en' ? 'Tap a device to adjust' : '点击设备即可调节'}<ChevronRight aria-hidden="true" /></span></div><h1>{pick(current.kicker)}</h1><p>{pick(current.message)}</p></div>
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
              <div className={`microwave-effect ${microwaveOn ? 'is-running' : 'is-stopped'}`}><span /></div>
              <div className={`induction-effect ${inductionOn ? 'is-running' : 'is-stopped'}`}><span /><span /></div>
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
            <div className="vehicle-load-layer" role="group" aria-label={locale === 'en' ? 'RV device controls' : '房车负载控制'}>
              {cabinLoads.map((load, index) => {
                const LoadIcon = load.icon;
                const state = getLoadState(load);
                return (
                  <button
                    key={`${activeScene}-${load.key}`}
                    className={`load-node load-${load.key} ${state.on ? 'is-on' : 'is-off'}`}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => { setSelectedLoadKey(load.key); setLoadSheetOpen(true); }}
                    style={{ animationDelay: `${index * 48}ms` }}
                    aria-label={`${pick(load.name)}: ${pick(state.value)} · ${locale === 'en' ? 'Edit device settings' : '编辑设备设置'}`}
                  >
                    <span className="load-node-icon"><LoadIcon aria-hidden="true" /><span className="load-state-dot" aria-hidden="true" /></span>
                    <span className="load-node-copy"><strong>{pick(load.name)}</strong><small>{pick(state.value)}</small></span>
                    <ChevronRight className="load-edit-arrow" aria-hidden="true" />
                  </button>
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
              <div><span className="eyebrow">{current.security ? (locale === 'en' ? '360° SENTINEL' : '360° 哨兵守护') : (locale === 'en' ? 'SMART LIVING' : '智能生活')}</span><h2>{current.security ? (locale === 'en' ? 'Security' : '安防') : (locale === 'en' ? 'Cabin systems' : '舱内系统')}</h2></div>
              {current.security ? <ShieldCheck className="panel-title-icon" aria-hidden="true" /> : <Armchair className="panel-title-icon" aria-hidden="true" />}
            </div>
            {current.security ? (
              <>
                <figure className="sentry-camera-wall" aria-label={locale === 'en' ? 'Four live cameras providing complete perimeter coverage' : '四路实时摄像头，全方位覆盖房车周界'}>
                  {sentryCameras.map(camera => {
                    const cameraAlert = intrusion && camera.detectsIntrusion;
                    return (
                      <button className={`sentry-camera camera-${camera.position} ${cameraAlert ? 'is-alert' : ''}`} type="button" key={camera.id} onClick={() => setSelectedCameraId(camera.id)} aria-label={`${locale === 'en' ? camera.label.en : camera.label.zh} · ${locale === 'en' ? 'Open enlarged live camera view' : '打开实时监控大画面'}`}>
                        <Image className="sentry-camera-image" src="/assets/sentry-cameras.png" width={1024} height={682} sizes="150px" alt="" />
                        <div className="camera-overlay" aria-hidden="true" />
                        <div className="sentry-camera-topline"><span className={cameraAlert ? 'sentry-live is-alert' : 'sentry-live'}><Radio aria-hidden="true" /> {cameraAlert ? (locale === 'en' ? 'ALERT' : '告警') : 'LIVE'}</span><span>CAM {camera.id}</span></div>
                        {cameraAlert ? <div className="sentry-detection"><span>{locale === 'en' ? 'PERSON · 98%' : '人员 · 98%'}</span></div> : <div className="sentry-scan" aria-hidden="true" />}
                        <div className="sentry-camera-caption"><Camera aria-hidden="true" /> {locale === 'en' ? camera.label.en : camera.label.zh}</div>
                        <span className="sentry-expand-hint" aria-hidden="true"><Maximize2 /></span>
                      </button>
                    );
                  })}
                </figure>
                <div className={`security-status ${intrusion ? 'security-alert' : ''}`}>
                  <div className="security-emblem">{intrusion ? <ShieldAlert aria-hidden="true" /> : <Radar aria-hidden="true" />}</div>
                  <div><small>{locale === 'en' ? '360° PERIMETER' : '360° 周界状态'}</small><strong>{intrusion ? (locale === 'en' ? 'Threat detected · Entry side' : '车门侧检测到异常') : (locale === 'en' ? '4 cameras · Full coverage' : '4路摄像头 · 全方位守护')}</strong></div>
                  <div className={intrusion ? 'perimeter-orbit has-alert' : 'perimeter-orbit'} aria-hidden="true"><span /><i /><i /><i /><i /></div>
                </div>
                <div className="readonly-note">{locale === 'en' ? 'Tap any camera to enlarge · Continuous recording' : '点击任一画面放大查看 · 持续录像'}</div>
                <div className="security-grid">
                  <SecurityItem icon={DoorClosed} label={locale === 'en' ? 'Doors' : '车门'} state={locale === 'en' ? 'Secured' : '已锁定'} alert={false} />
                  <SecurityItem icon={ScanLine} label={locale === 'en' ? 'Motion' : '移动侦测'} state={intrusion ? (locale === 'en' ? 'Detected' : '已检测') : (locale === 'en' ? 'Active' : '已开启')} alert={intrusion} />
                  <SecurityItem icon={Camera} label={locale === 'en' ? 'Cameras' : '摄像头'} state={locale === 'en' ? '4 / 4 online' : '4 / 4 在线'} alert={false} />
                  <SecurityItem icon={Siren} label={locale === 'en' ? 'Siren' : '警报器'} state={intrusion ? (locale === 'en' ? 'Active' : '已响起') : (locale === 'en' ? 'Ready' : '待命')} alert={intrusion} />
                </div>
                <button className={intrusion ? 'alert-action dismiss-action' : 'alert-action'} onClick={() => setIntrusion(!intrusion)}>
                  {intrusion ? <X aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
                  {intrusion ? (locale === 'en' ? 'Resolve demo alert' : '解除演示警报') : (locale === 'en' ? 'Tap to simulate motion' : '点击模拟移动入侵')}
                  <ChevronRight aria-hidden="true" />
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
                <div className="active-load-heading"><span>{locale === 'en' ? 'Device status · View only' : '设备状态 · 仅展示'}</span><strong>{activeLoads.length}</strong></div>
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
          <div className="scene-intro"><span className="eyebrow">{locale === 'en' ? 'ONE-TOUCH SCENES' : '一键场景'}</span><strong>{locale === 'en' ? 'Tap a scene to begin' : '点击场景，一键联动'}</strong></div>
          <div className="scene-buttons">{sceneOrder.map(key => {
            const scene = scenes[key]; const SceneIcon = scene.sceneIcon; const selected = (pendingScene ?? activeScene) === key;
            return <button key={key} className={selected ? 'scene-button is-selected' : 'scene-button'} onClick={() => activateScene(key)} aria-pressed={selected}><span className="scene-button-icon"><SceneIcon aria-hidden="true" /></span><span><strong>{pick(scene.name)}</strong><small>{pendingScene === key ? (locale === 'en' ? 'Activating…' : '切换中…') : selected ? (locale === 'en' ? 'Active' : '当前场景') : (locale === 'en' ? 'Tap to activate' : '点击切换')}</small></span>{selected ? <Check className="scene-check" aria-hidden="true" /> : <ChevronRight className="scene-action-arrow" aria-hidden="true" />}</button>;
          })}</div>
          <button className="efficiency-pill" type="button" onClick={() => { setEfficiencyScene(activeScene); setEfficiencyOpen(true); }} aria-haspopup="dialog" aria-label={locale === 'en' ? `Energy optimization score ${activeEnergyInsight.score}, view details` : `能源优化评分${activeEnergyInsight.score}分，查看详情`}><Gauge aria-hidden="true" /><div><strong>{activeEnergyInsight.score}<span>{locale === 'en' ? '/100' : '分'}</span></strong><small>{locale === 'en' ? 'Optimization · Details' : '能源优化 · 详情'}</small></div><ChevronRight aria-hidden="true" /></button>
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
        {!selectedLoad && <p className="sheet-interaction-hint"><Hand aria-hidden="true" />{locale === 'en' ? 'Tap a device for settings · Use its switch for quick control · Sensors are view only' : '点击设备调节参数 · 拨动开关快捷操作 · 传感器仅查看数据'}</p>}
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
              const quickControlLocked = !state.on && (
                (load.key === 'microwave' && deviceControls.microwave?.safetyLock === true)
                || (load.key === 'induction' && deviceControls.induction?.childLock === true)
              );
              const quickStateLabel = quickControlLocked
                ? (locale === 'en' ? 'LOCKED' : '已锁')
                : load.key === 'shades'
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
    <Dialog open={efficiencyOpen} onOpenChange={setEfficiencyOpen}>
      <DialogContent className="efficiency-dialog" showCloseButton={false}>
        <DialogHeader className="efficiency-dialog-header">
          <div><span className="eyebrow">RENOGY INTELLIGENT ENERGY</span><DialogTitle>{locale === 'en' ? 'Energy optimization score' : '能源优化评分'}</DialogTitle><DialogDescription>{locale === 'en' ? 'How the current scene balances comfort, power and available energy.' : '了解当前场景如何平衡舒适体验、负载功耗与可用能源。'}</DialogDescription></div>
          <DialogClose className="efficiency-close" aria-label={locale === 'en' ? 'Close energy details' : '关闭能源详情'}><X aria-hidden="true" /></DialogClose>
        </DialogHeader>
        <div className="efficiency-overview">
          <div className="efficiency-score-orbit"><Gauge aria-hidden="true" /><strong>{selectedEnergyInsight.score}<span>/100</span></strong><small>{pick(selectedEnergyInsight.grade)}</small></div>
          <div className="efficiency-explanation"><span>{pick(scenes[efficiencyScene].name)} {locale === 'en' ? 'MODE' : '模式'}</span><h3>{pick(selectedEnergyInsight.summary)}</h3><p>{pick(selectedEnergyInsight.explanation)}</p></div>
        </div>
        <div className="efficiency-scene-tabs" aria-label={locale === 'en' ? 'Compare scene scores' : '对比场景评分'}>
          {sceneOrder.map(key => { const SceneIcon = scenes[key].sceneIcon; const selected = efficiencyScene === key; return <button type="button" key={key} className={selected ? 'is-selected' : ''} onClick={() => setEfficiencyScene(key)} aria-pressed={selected}><SceneIcon aria-hidden="true" /><span><strong>{pick(scenes[key].name)}</strong><small>{locale === 'en' ? 'View breakdown' : '查看构成'}</small></span><b>{energyInsights[key].score}</b></button>; })}
        </div>
        <section className="efficiency-breakdown" aria-labelledby="efficiency-breakdown-title">
          <div className="efficiency-section-heading"><div><span className="eyebrow">WEIGHTED MODEL</span><h3 id="efficiency-breakdown-title">{locale === 'en' ? 'Score breakdown' : '评分构成'}</h3></div><small>{locale === 'en' ? 'Weighted total' : '加权计算'}</small></div>
          <div className="efficiency-factor-grid">{selectedEnergyInsight.factors.map(factor => <div className="efficiency-factor" key={factor.name.en}><div><span>{pick(factor.name)} <small>{factor.weight}%</small></span><strong>{factor.score}</strong></div><span className="efficiency-factor-bar"><i style={{ width: `${factor.score}%` }} /></span></div>)}</div>
        </section>
        <div className="efficiency-detail-grid">
          <section className="efficiency-actions"><span className="eyebrow">{locale === 'en' ? 'ACTIVE OPTIMIZATIONS' : '当前优化动作'}</span>{selectedEnergyInsight.actions.map(action => <p key={action.en}><Check aria-hidden="true" />{pick(action)}</p>)}</section>
          <section className="efficiency-opportunity"><Sparkles aria-hidden="true" /><div><span>{locale === 'en' ? 'NEXT OPPORTUNITY' : '下一步建议'}</span><p>{pick(selectedEnergyInsight.opportunity)}</p></div></section>
        </div>
        <p className="efficiency-model-note">{locale === 'en' ? 'Concept score based on the current scene configuration and simulated demo data.' : '概念评分依据当前场景配置与模拟演示数据计算。'}</p>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(selectedCamera)} onOpenChange={open => { if (!open) setSelectedCameraId(null); }}>
      <DialogContent className="camera-dialog" showCloseButton={false}>
        {selectedCamera && (
          <>
            <DialogHeader className="camera-dialog-header">
              <div><span className="eyebrow">360° SENTINEL · CAM {selectedCamera.id}</span><DialogTitle>{locale === 'en' ? selectedCamera.label.en : selectedCamera.label.zh}</DialogTitle><DialogDescription>{locale === 'en' ? 'Live view from a camera mounted directly on the RV body.' : '来自安装在房车车身上的摄像头实时画面。'}</DialogDescription></div>
              <DialogClose className="efficiency-close" aria-label={locale === 'en' ? 'Close camera view' : '关闭摄像头画面'}><X aria-hidden="true" /></DialogClose>
            </DialogHeader>
            <div className={`camera-dialog-feed camera-${selectedCamera.position} ${intrusion && selectedCamera.detectsIntrusion ? 'is-alert' : ''}`}>
              <Image className="sentry-camera-image" src="/assets/sentry-cameras.png" width={1024} height={682} sizes="(max-width: 760px) 92vw, 900px" alt={`${locale === 'en' ? selectedCamera.label.en : selectedCamera.label.zh} ${locale === 'en' ? 'enlarged live camera view' : '实时监控放大画面'}`} />
              <div className="camera-overlay" aria-hidden="true" />
              <div className="camera-dialog-topline"><span className={intrusion && selectedCamera.detectsIntrusion ? 'live-pill alert-pill' : 'live-pill'}><Radio aria-hidden="true" /> {intrusion && selectedCamera.detectsIntrusion ? (locale === 'en' ? 'ALERT' : '告警') : 'LIVE'}</span><span>CAM {selectedCamera.id} · {current.time}</span></div>
              {intrusion && selectedCamera.detectsIntrusion ? <div className="sentry-detection is-enlarged"><span>{locale === 'en' ? 'PERSON DETECTED · 98%' : '检测到人员 · 98%'}</span></div> : <div className="sentry-scan" aria-hidden="true" />}
              <div className="camera-dialog-caption"><Camera aria-hidden="true" /><strong>{locale === 'en' ? selectedCamera.label.en : selectedCamera.label.zh}</strong><span>{locale === 'en' ? 'Vehicle-mounted camera' : '车载摄像头'}</span></div>
            </div>
            <div className="camera-dialog-status"><span><Radio aria-hidden="true" />{locale === 'en' ? 'Live stream' : '实时画面'}</span><span><Camera aria-hidden="true" />{locale === 'en' ? '4 / 4 cameras online' : '4 / 4 摄像头在线'}</span><span><ShieldCheck aria-hidden="true" />{locale === 'en' ? 'Continuous recording' : '持续录像'}</span></div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
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
      case 'microwave':
        return <><SegmentedControl label={t('Cooking program', '烹饪程序')} options={['Reheat', 'Defrost', 'Popcorn', 'Manual']} value={stringValue('program', 'Reheat')} locale={locale} onChange={value => onUpdate('program', value)} /><RangeControl label={t('Microwave power', '微波功率')} value={numberValue('power', 800)} min={200} max={1000} step={100} unit="W" onChange={value => onUpdate('power', value)} /><RangeControl label={t('Cook time', '加热时间')} value={numberValue('timer', 90)} min={30} max={600} step={30} unit="s" onChange={value => onUpdate('timer', value)} /><div className="control-group"><span className="control-label">{t('Safety lock', '安全锁')}</span><div className="control-actions two-up"><button className={controls.safetyLock === true ? 'is-selected' : ''} type="button" onClick={() => onUpdate('safetyLock', true)}><Lock aria-hidden="true" />{t('Locked', '已锁定')}</button><button className={controls.safetyLock !== true ? 'is-selected' : ''} type="button" onClick={() => onUpdate('safetyLock', false)}><DoorClosed aria-hidden="true" />{t('Unlocked', '已解锁')}</button></div></div><div className="device-safety-note"><ShieldCheck aria-hidden="true" /><span><strong>{t('Manual start required', '必须手动启动')}</strong>{t('Scenes may prepare a preset or stop heating, but never start the microwave automatically. Door interlock: closed.', '场景可准备预设或停止加热，但绝不会自动启动微波炉。门体联锁：已闭合。')}</span></div></>;
      case 'induction':
        return <><SegmentedControl label={t('Cooking mode', '烹饪模式')} options={['Simmer', 'Boil', 'Fry']} value={stringValue('mode', 'Simmer')} locale={locale} onChange={value => onUpdate('mode', value)} /><RangeControl label={t('Heating power', '加热功率')} value={numberValue('power', 600)} min={300} max={1800} step={100} unit="W" onChange={value => onUpdate('power', value)} /><RangeControl label={t('Auto-off timer', '定时关闭')} value={numberValue('timer', 15)} min={0} max={60} step={5} unit="min" onChange={value => onUpdate('timer', value)} /><div className="control-group"><span className="control-label">{t('Child lock', '童锁')}</span><div className="control-actions two-up"><button className={controls.childLock === true ? 'is-selected' : ''} type="button" onClick={() => onUpdate('childLock', true)}><Lock aria-hidden="true" />{t('Locked', '已锁定')}</button><button className={controls.childLock !== true ? 'is-selected' : ''} type="button" onClick={() => onUpdate('childLock', false)}><DoorClosed aria-hidden="true" />{t('Unlocked', '已解锁')}</button></div></div><div className="device-safety-note"><ShieldCheck aria-hidden="true" /><span><strong>{t('Cookware detection active', '锅具检测已启用')}</strong>{t('A scene can switch off and lock the cooktop, but heating always requires a manual start.', '场景可以关闭并锁定电磁炉，但加热始终需要用户手动启动。')}</span></div></>;
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
  const powerBlocked = !state.on && (
    (device.key === 'microwave' && controls.safetyLock === true)
    || (device.key === 'induction' && controls.childLock === true)
  );
  const powerLabel = device.key === 'microwave'
    ? (state.on ? t('Stop heating', '停止加热') : powerBlocked ? t('Unlock first', '请先解锁') : t('Start heating', '开始加热'))
    : device.key === 'induction'
      ? (state.on ? t('Stop cooking', '停止加热') : powerBlocked ? t('Unlock first', '请先解锁') : t('Start cooking', '开始加热'))
      : state.on ? t('Turn off', '关闭') : t('Turn on', '开启');
  const controlsAvailable = state.on || hidesPower || device.key === 'microwave' || device.key === 'induction';
  return (
    <section className="device-control-panel" aria-label={`${device.name[locale]} ${t('controls', '控制')}`}>
      <div className="device-control-summary">
        <span className="device-control-icon"><DeviceIcon aria-hidden="true" /></span>
        <div><small>{t('CURRENT STATE', '当前状态')}</small><strong aria-live="polite">{state.value[locale]}</strong><span>{t('Changes apply immediately to this scene', '修改将立即应用到当前场景')}</span></div>
        {!hidesPower && <button className={`device-power-button ${state.on ? 'is-on' : ''}`} type="button" aria-pressed={state.on} disabled={powerBlocked} onClick={onToggle}><Power aria-hidden="true" />{powerLabel}</button>}
      </div>
      <div className={`device-control-fields ${controlsAvailable ? '' : 'is-disabled'}`}>{controlBody}</div>
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
