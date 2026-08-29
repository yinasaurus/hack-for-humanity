"""Render four neutral previews of a GLB for quick visual QA."""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def args() -> tuple[Path, Path, str | None, int | None]:
    if "--" not in sys.argv:
        raise SystemExit("Expected input GLB and output directory after --")
    values = sys.argv[sys.argv.index("--") + 1 :]
    if len(values) not in (2, 3, 4):
        raise SystemExit("Usage: -- input.glb output-directory [REST|action-name] [frame]")
    return (
        Path(values[0]).resolve(),
        Path(values[1]).resolve(),
        values[2] if len(values) >= 3 else None,
        int(values[3]) if len(values) == 4 else None,
    )


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


source, output_dir, pose_mode, pose_frame = args()
output_dir.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
if pose_mode:
    for armature in armatures:
        if not armature.animation_data:
            continue
        if pose_mode == "REST":
            armature.animation_data.action = None
            for track in armature.animation_data.nla_tracks:
                track.mute = True
            for bone in armature.pose.bones:
                bone.location = (0.0, 0.0, 0.0)
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
                bone.scale = (1.0, 1.0, 1.0)
        else:
            action = bpy.data.actions.get(pose_mode)
            if action is None:
                raise SystemExit(f"Action not found: {pose_mode}")
            armature.animation_data.action = action
            for track in armature.animation_data.nla_tracks:
                track.mute = True

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("PreviewWorld")
scene.world.color = (0.035, 0.045, 0.065)

# Ignore helper geometry with no material; retain the textured skinned horse.
meshes = [
    obj
    for obj in scene.objects
    if obj.type == "MESH" and any(slot.material for slot in obj.material_slots)
]
if not meshes:
    raise SystemExit("No material-bearing meshes found")

scene.frame_set(pose_frame if pose_frame is not None else (1 if pose_mode == "REST" else 0))
corners = []
for obj in meshes:
    corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
center = (minimum + maximum) * 0.5
size = maximum - minimum
radius = max(size.x, size.y, size.z) * 0.72

bpy.ops.mesh.primitive_plane_add(size=max(size.x, size.y) * 4.0, location=(center.x, center.y, minimum.z - 0.008))
ground = bpy.context.object
ground.name = "PreviewGround"
ground_material = bpy.data.materials.new("PreviewGroundMaterial")
ground_material.diffuse_color = (0.055, 0.07, 0.09, 1.0)
ground_material.roughness = 0.82
ground.data.materials.append(ground_material)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.lens = 58
scene.camera = camera

for name, energy, scale, offset in (
    ("Key", 1000.0, 5.0, Vector((2.5, -3.0, 4.0))),
    ("Fill", 600.0, 4.0, Vector((-3.0, -1.0, 2.5))),
    ("Rim", 900.0, 3.0, Vector((1.5, 3.0, 3.5))),
):
    bpy.ops.object.light_add(type="AREA", location=center + offset.normalized() * radius * 3.0)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = scale
    point_camera(light, center)

views = {
    "front": Vector((0.0, -1.0, 0.24)),
    "three_quarter": Vector((0.72, -0.72, 0.24)),
    "side": Vector((1.0, 0.0, 0.2)),
    "rear_three_quarter": Vector((0.72, 0.72, 0.24)),
}

for name, direction in views.items():
    camera.location = center + direction.normalized() * radius * 3.2
    point_camera(camera, center + Vector((0.0, 0.0, size.z * 0.03)))
    scene.render.filepath = str(output_dir / f"{name}.png")
    bpy.ops.render.render(write_still=True)

print(f"Rendered {len(views)} previews to {output_dir}")
