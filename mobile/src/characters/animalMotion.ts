/** Root-motion constraints for grounded semantic gestures. */
export type RootMotionPolicy = {
  allowX: boolean;
  allowY: boolean;
  allowZ: boolean;
  allowYaw: boolean;
  allowPitch: boolean;
  allowRoll: boolean;
};

export type RootPose = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
};

export const GROUNDED_WAVE_ROOT_POLICY: RootMotionPolicy = {
  allowX: false,
  allowY: true,
  allowZ: false,
  allowYaw: false,
  allowPitch: false,
  allowRoll: false,
};

export const WAVE_ROOT_MAX_LIFT = 0.01;
export const GROUNDED_PLAY_ROOT_POLICY: RootMotionPolicy = {
  allowX: false,
  allowY: true,
  allowZ: false,
  allowYaw: false,
  allowPitch: false,
  allowRoll: false,
};
export const PLAY_ROOT_MAX_LIFT = 0.11;

/**
 * Keep a Wave centered while allowing only a tiny optional vertical lift.
 * This is the public seam used by motion tests and future renderer adapters.
 */
export function groundedWaveRootPose(base: RootPose, requestedLift = 0): RootPose {
  const lift = Math.max(-WAVE_ROOT_MAX_LIFT, Math.min(WAVE_ROOT_MAX_LIFT, requestedLift));
  return {
    position: {
      x: base.position.x,
      y: base.position.y + lift,
      z: base.position.z,
    },
    rotation: {
      x: base.rotation.x,
      y: base.rotation.y,
      z: base.rotation.z,
    },
  };
}

/** Keep Play's hop vertical and bounded without allowing root drift. */
export function groundedPlayRootPose(base: RootPose, requestedLift = 0): RootPose {
  const lift = Math.max(-PLAY_ROOT_MAX_LIFT, Math.min(PLAY_ROOT_MAX_LIFT, requestedLift));
  return {
    position: {
      x: base.position.x,
      y: base.position.y + lift,
      z: base.position.z,
    },
    rotation: {
      x: base.rotation.x,
      y: base.rotation.y,
      z: base.rotation.z,
    },
  };
}

export type TransformLike = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
};

export type TransformSnapshot = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
};

/** Snapshot one bone/segment before applying a procedural overlay. */
export function snapshotTransform(source: TransformLike): TransformSnapshot {
  return {
    position: { ...source.position },
    rotation: { ...source.rotation },
    scale: { ...source.scale },
  };
}

/** Restore an overlay target exactly, preventing repeated actions from drifting. */
export function restoreTransform<T extends TransformLike>(
  target: T,
  snapshot: TransformSnapshot
): T {
  Object.assign(target.position, snapshot.position);
  Object.assign(target.rotation, snapshot.rotation);
  Object.assign(target.scale, snapshot.scale);
  return target;
}
