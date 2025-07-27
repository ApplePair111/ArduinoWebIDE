// --- Constants ---
declare const HIGH: number;
declare const LOW: number;
declare const INPUT: number;
declare const OUTPUT: number;
declare const INPUT_PULLUP: number;

declare const PI: number;
declare const HALF_PI: number;
declare const TWO_PI: number;
declare const DEG_TO_RAD: number;
declare const RAD_TO_DEG: number;
declare const EULER: number;

declare const SERIAL: number;
declare const DISPLAY: number;

declare const LSBFIRST: number;
declare const MSBFIRST: number;

declare const CHANGE: number;
declare const FALLING: number;
declare const RISING: number;

declare const DEFAULT: number;
declare const EXTERNAL: number;
declare const INTERNAL: number;
declare const INTERNAL1V1: number;
declare const INTERNAL2V56: number;
declare const INTERNAL2V56_EXTCAP: number;

declare const NOT_A_PIN: number;
declare const NOT_A_PORT: number;
declare const NOT_AN_INTERRUPT: number;

// --- Timer Constants ---
declare const NOT_ON_TIMER: number;
declare const TIMER0A: number;
declare const TIMER0B: number;
declare const TIMER1A: number;
declare const TIMER1B: number;
declare const TIMER1C: number;
declare const TIMER2: number;
declare const TIMER2A: number;
declare const TIMER2B: number;
declare const TIMER3A: number;
declare const TIMER3B: number;
declare const TIMER3C: number;
declare const TIMER4A: number;
declare const TIMER4B: number;
declare const TIMER4C: number;
declare const TIMER4D: number;
declare const TIMER5A: number;
declare const TIMER5B: number;
declare const TIMER5C: number;

// --- Types ---
declare type boolean = boolean;
declare type byte = number;
declare type word = number;

// --- Core Functions ---
declare function yield(): void;
declare function init(): void;
declare function initVariant(): void;

declare function pinMode(pin: number, mode: number): void;
declare function digitalWrite(pin: number, value: number): void;
declare function digitalRead(pin: number): number;

declare function analogRead(pin: number): number;
declare function analogReference(mode: number): void;
declare function analogWrite(pin: number, value: number): void;

declare function millis(): number;
declare function micros(): number;
declare function delay(ms: number): void;
declare function delayMicroseconds(us: number): void;
declare function pulseIn(pin: number, state: number, timeout?: number): number;
declare function pulseInLong(pin: number, state: number, timeout?: number): number;

declare function shiftOut(dataPin: number, clockPin: number, bitOrder: number, val: number): void;
declare function shiftIn(dataPin: number, clockPin: number, bitOrder: number): number;

declare function attachInterrupt(interruptNum: number, userFunc: () => void, mode: number): void;
declare function detachInterrupt(interruptNum: number): void;

declare function tone(pin: number, frequency: number, duration?: number): void;
declare function noTone(pin: number): void;

// --- Arduino Lifecycle ---
declare function setup(): void;
declare function loop(): void;

// --- Serial Object ---
declare const Serial: {
  begin(baud: number): void;
  end(): void;
  print(data: any): void;
  println(data: any): void;
  available(): number;
  read(): number;
  flush(): void;
};

// --- Math Helpers ---
declare function random(max: number): number;
declare function random(min: number, max: number): number;
declare function randomSeed(seed: number): void;
declare function map(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number;

declare function min(a: number, b: number): number;
declare function max(a: number, b: number): number;
declare function abs(x: number): number;
declare function constrain(x: number, low: number, high: number): number;
declare function round(x: number): number;
declare function radians(deg: number): number;
declare function degrees(rad: number): number;
declare function sq(x: number): number;
