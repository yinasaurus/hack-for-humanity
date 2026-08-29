"""Validate Buddi's exported horse animation set and loop seams."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy


source = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

armature = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
required = ("Idle", "Talk", "Wave", "Curious", "Gentle", "Run")
missing = [name for name in required if bpy.data.actions.get(name) is None]
if missing:
    raise SystemExit("Missing actions: " + ", ".join(missing))

for track in armature.animation_data.nla_tracks:
    track.mute = True


def matrix_error(left, right) -> float:
    return max(abs(float(left[row][column] - right[row][column])) for row in range(4) for column in range(4))


def set_frame(value: float) -> None:
    whole = math.floor(value)
    bpy.context.scene.frame_set(whole, subframe=value - whole)


def action_bone_motion(action, bone_names: tuple[str, ...], sample_count: int = 9) -> float:
    armature.animation_data.action = action
    start = float(action.frame_range[0])
    end = float(action.frame_range[1])
    set_frame(start)
    baseline = {name: armature.pose.bones[name].matrix_basis.copy() for name in bone_names}
    maximum = 0.0
    for index in range(1, sample_count):
        set_frame(start + (end - start) * index / (sample_count - 1))
        maximum = max(
            maximum,
            *(matrix_error(baseline[name], armature.pose.bones[name].matrix_basis) for name in bone_names),
        )
    return maximum


def action_root_extremes(action, sample_count: int = 13) -> tuple[float, float]:
    armature.animation_data.action = action
    start = float(action.frame_range[0])
    end = float(action.frame_range[1])
    max_angle = 0.0
    max_translation = 0.0
    for index in range(sample_count):
        set_frame(start + (end - start) * index / (sample_count - 1))
        basis = armature.pose.bones["body_023"].matrix_basis
        max_angle = max(max_angle, float(basis.to_quaternion().angle))
        max_translation = max(max_translation, float(basis.to_translation().length))
    return max_angle, max_translation


report = {}
for name in required:
    action = bpy.data.actions[name]
    armature.animation_data.action = action
    start = float(action.frame_range[0])
    end = float(action.frame_range[1])
    middle = (start + end) / 2

    set_frame(start)
    start_matrices = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    start_hoof_z = armature.pose.bones["leg_front_left_hoof_07"].head.z

    set_frame(middle)
    middle_matrices = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    middle_hoof_z = armature.pose.bones["leg_front_left_hoof_07"].head.z

    set_frame(end)
    end_matrices = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}

    seam_error = max(matrix_error(start_matrices[bone], end_matrices[bone]) for bone in start_matrices)
    motion = max(matrix_error(start_matrices[bone], middle_matrices[bone]) for bone in start_matrices)
    values = [value for matrix in middle_matrices.values() for row in matrix for value in row]
    if not all(math.isfinite(value) for value in values):
        raise SystemExit(f"{name} contains a non-finite transform")
    if seam_error > 1e-4:
        raise SystemExit(f"{name} loop seam error is {seam_error}")
    if motion < 1e-4:
        raise SystemExit(f"{name} has no visible motion")

    report[name] = {
        "frames": [round(start, 3), round(end, 3)],
        "duration_seconds": round((end - start) / bpy.context.scene.render.fps, 3),
        "loop_seam_error": round(seam_error, 7),
        "middle_pose_delta": round(motion, 5),
        "left_forehoof_lift": round(float(middle_hoof_z - start_hoof_z), 5),
    }

wave = bpy.data.actions["Wave"]
wave_body_motion = action_bone_motion(wave, ("body_top0_034", "body_top1_037", "pelvis_016"))
wave_support_motion = action_bone_motion(
    wave,
    ("leg_front_right_top0_09", "leg_hind_left_top0_024", "leg_hind_right_top0_030"),
)
quality_errors = []
if wave_body_motion < 0.01:
    quality_errors.append(f"Wave isolates the raised joint; torso/pelvis motion is only {wave_body_motion}")
if wave_support_motion < 0.01:
    quality_errors.append(f"Wave support legs are stationary; motion is only {wave_support_motion}")

play = bpy.data.actions.get("Play") or bpy.data.actions["Run"]
play_body_motion = action_bone_motion(play, ("body_top0_034", "body_top1_037", "pelvis_016", "neck0_038"))
play_leg_motion = action_bone_motion(
    play,
    (
        "leg_front_left_top0_03",
        "leg_front_right_top0_09",
        "leg_hind_left_top0_024",
        "leg_hind_right_top0_030",
    ),
)
play_root_angle, play_root_translation = action_root_extremes(play)
if play.name != "Play":
    quality_errors.append("Play is falling back to the imported Run clip with incompatible root motion")
if play_root_angle > math.radians(25):
    quality_errors.append(f"Play flips the horse root by {math.degrees(play_root_angle):.2f} degrees")
if play_root_translation > 8.0:
    quality_errors.append(f"Play sinks/translates the horse root by {play_root_translation:.2f} rig units")
if play_body_motion < 0.01 or play_leg_motion < 0.01:
    quality_errors.append(
        f"Play is not full-body motion (body={play_body_motion:.5f}, legs={play_leg_motion:.5f})"
    )
if quality_errors:
    raise SystemExit("\n".join(quality_errors))

report["quality"] = {
    "wave_body_motion": round(wave_body_motion, 5),
    "wave_support_motion": round(wave_support_motion, 5),
    "play_action": play.name,
    "play_body_motion": round(play_body_motion, 5),
    "play_leg_motion": round(play_leg_motion, 5),
    "play_root_angle_degrees": round(math.degrees(play_root_angle), 4),
    "play_root_translation": round(play_root_translation, 5),
}

print("HORSE_ANIMATION_VALIDATION=" + json.dumps(report, separators=(",", ":")))
