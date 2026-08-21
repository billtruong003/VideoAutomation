/**
 * registry.tsx — the name -> component tables the scene DSL resolves against.
 *
 * A spec says `{ k: 'prop', name: 'TapeMeasure' }` and this is where that string becomes a
 * component. Kept as explicit tables rather than a glob for the same reason the episode
 * registry is: Remotion bundles with esbuild, and a dynamic import would defeat both bundling
 * and type-checking. An unknown name throws at render with the scene that asked for it, which
 * is early enough to be cheap.
 *
 * Everything here already existed. The DSL introduces no new drawing.
 */

import type React from 'react';
import * as everyday from '../backgrounds/everyday';
import * as diagram from '../fx/diagram';
import * as marks from '../fx/marks';
import * as machines from '../props/machines';
import * as money from '../props/money';
import * as objects from '../props/objects';
import * as time from '../props/time';
import * as travel from '../props/travel';
import * as world from '../props/world';
import * as batch002 from '../props/batch002';

/**
 * The DSL resolves components by NAME, so these tables are inherently dynamic and the
 * per-component prop types cannot survive the lookup. They are declared with a permissive
 * signature at this boundary and nowhere else: a spec that names a prop that does not exist,
 * or passes it an argument it does not take, is caught by rendering the scene rather than by
 * the compiler.
 *
 * The prop namespaces also export a few plain constants alongside their components
 * (`JEANS_POCKET`, `PANE_X`), which is why the spread needs the cast rather than just a
 * `Record` annotation.
 */
export type SceneComponent = React.FC<Record<string, unknown>>;

/** Backgrounds are drawn behind the stage SVG and take only `frame`. */
export const BACKGROUNDS: Record<string, SceneComponent> = {
  PlaneCabin: everyday.PlaneCabin,
  CutawayVoid: everyday.CutawayVoid,
  SchematicVoid: everyday.SchematicVoid,
  MallInterior: everyday.MallInterior,
  GasStation: everyday.GasStation,
  KitchenCounter: everyday.KitchenCounter,
  BedroomFloor: everyday.BedroomFloor,
  OldWorkshop: everyday.OldWorkshop,
  HighwayRoad: everyday.HighwayRoad,
  HighwayRoadside: everyday.HighwayRoadside,
  HighwayTopDown: everyday.HighwayTopDown,
  CarInterior: everyday.CarInterior,
  CityStreet: everyday.CityStreet,
  DeskSurface: everyday.DeskSurface,
  LibraryShelf: everyday.LibraryShelf,
  ConservationLab: everyday.ConservationLab,
} as unknown as Record<string, SceneComponent>;

/** Props take the PropFrame contract: x, y, scale, rotate, frame, seed, plus their own args. */
export const PROPS: Record<string, SceneComponent> = {
  // inherited library
  ...machines,
  ...money,
  ...objects,
  ...time,
  ...travel,
  ...world,
  // authored for this batch
  ...batch002,
} as unknown as Record<string, SceneComponent>;

/** Diagram and annotation marks. Same positional contract as props. */
export const MARKS: Record<string, SceneComponent> = {
  ...diagram,
  ...marks,
} as unknown as Record<string, SceneComponent>;
