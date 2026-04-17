import fs from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

globalThis.self = globalThis;

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.result = null;
      this.onloadend = null;
    }

    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      if (typeof this.onloadend === "function") {
        this.onloadend();
      }
    }

    async readAsDataURL(blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const type = blob.type || "application/octet-stream";
      this.result = `data:${type};base64,${base64}`;
      if (typeof this.onloadend === "function") {
        this.onloadend();
      }
    }
  };
}

const sourcePath = process.argv[2] ?? "public/assets/Map/futuristic low poly city by niko.fbx";
const outputPath = process.argv[3] ?? "public/assets/Map/futuristic_low_poly_city.glb";
const stageCatalogPath = "public/assets/Map/index.json";

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickPaletteColor(palette, seed) {
  return new THREE.Color(palette[seed % palette.length]);
}

function getMeshBaseName(name) {
  return name.match(/^(mesh_\d+)/)?.[1] ?? name;
}

function matchesMeshPrefix(name, prefixes) {
  const baseName = getMeshBaseName(name);
  return prefixes.some((prefix) => prefix === name || prefix === baseName || name.startsWith(`${prefix}_`));
}

async function loadStageStyleConfig() {
  try {
    const raw = await fs.readFile(stageCatalogPath, "utf8");
    const data = JSON.parse(raw);
    const stages = Array.isArray(data.stages) ? data.stages : [];
    const selectedStage = stages.find((stage) => stage.id === data.defaultStageId) ?? stages[0] ?? {};
    return {
      walkableMeshPrefixes: Array.isArray(selectedStage.grounding?.walkableMeshPrefixes)
        ? selectedStage.grounding.walkableMeshPrefixes
        : [],
      route: selectedStage.route ?? {},
    };
  } catch {
    return {
      walkableMeshPrefixes: [],
      route: {},
    };
  }
}

function buildSciFiSurfaceStyle(name, bounds, stageStyle) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const footprint = size.x * size.z;
  const seed = hashString(
    `${name}:${Math.round(center.x)}:${Math.round(center.y)}:${Math.round(center.z)}`,
  );
  const routeColor = new THREE.Color(stageStyle.route?.color ?? 0x46f4ff);
  const routeEdgeColor = new THREE.Color(stageStyle.route?.edgeColor ?? 0xff58d6);
  const isRoad = matchesMeshPrefix(name, stageStyle.walkableMeshPrefixes);
  const isMegaBase = bounds.min.y < 220 && footprint > 10_000_000 && size.y < 3400;
  const isStreet = isRoad || isMegaBase || (bounds.min.y < 260 && size.y < 950 && footprint > 150_000);
  const isTallBuilding = size.y > 1350 || center.y > 850;
  const isAccentDetail = /^(circle|cylinder)/i.test(name);
  const isWindowBand =
    !isStreet &&
    !isAccentDetail &&
    center.y > 1200 &&
    size.y < 220 &&
    footprint < 450000;

  if (isStreet) {
    const base = pickPaletteColor([0x111827, 0x141c29, 0x162133, 0x0f1a29], seed);
    const edge = pickPaletteColor([0x20364b, 0x29476a, 0x223b61], seed >> 4);
    const color = base
      .lerp(edge, 0.16 + ((seed >> 8) & 7) / 28)
      .lerp(routeColor, isRoad ? 0.14 : 0.04);
    return {
      color,
      emissive: routeColor.clone().lerp(routeEdgeColor, 0.3).multiplyScalar(isRoad ? 0.16 : 0.06),
      roughness: isRoad ? 0.82 : 0.92,
      metalness: isRoad ? 0.18 : 0.1,
    };
  }

  if (isWindowBand) {
    const color = pickPaletteColor([0x47f2ff, 0xff64da, 0x8c78ff], seed);
    return {
      color: color.clone().multiplyScalar(0.85),
      emissive: color.clone().multiplyScalar(0.55),
      roughness: 0.24,
      metalness: 0.62,
    };
  }

  if (isTallBuilding) {
    const hue = 0.56 + ((seed % 18) / 18) * 0.14;
    const saturation = 0.3 + (((seed >> 5) & 15) / 15) * 0.2;
    const lightness = 0.3 + (((seed >> 9) & 15) / 15) * 0.18;
    const color = new THREE.Color().setHSL(hue % 1, saturation, lightness);
    const emissiveHue = (hue + 0.08 + (((seed >> 13) & 7) / 7) * 0.08) % 1;
    const emissive = new THREE.Color()
      .setHSL(emissiveHue, 0.92, 0.58)
      .multiplyScalar(0.12 + (((seed >> 17) & 7) / 7) * 0.1);
    return {
      color,
      emissive,
      roughness: 0.62,
      metalness: 0.32,
    };
  }

  if (isAccentDetail) {
    const color = pickPaletteColor([0x36d9ff, 0x8a70ff, 0xff69c9, 0xffb15f], seed);
    return {
      color,
      emissive: color.clone().multiplyScalar(0.38),
      roughness: 0.28,
      metalness: 0.58,
    };
  }

  const utilityBase = pickPaletteColor([0x2c4166, 0x36517c, 0x30496e, 0x3a4b7d], seed);
  const utilityAccent = pickPaletteColor([0x47f2ff, 0x9c7cff, 0xff78df], seed >> 3);
  return {
    color: utilityBase.lerp(utilityAccent, 0.14 + (((seed >> 7) & 7) / 50)),
    emissive: utilityAccent.clone().multiplyScalar(0.08 + (((seed >> 10) & 7) / 70)),
    roughness: 0.66,
    metalness: 0.24,
  };
}

function convertMaterial(material, surfaceStyle) {
  if (!material) {
    return material;
  }

  const opacity = Number.isFinite(material.opacity) && material.opacity > 0
    ? material.opacity
    : 1;
  const transparent = material.transparent === true && opacity < 1;

  return new THREE.MeshStandardMaterial({
    name: material.name,
    color: surfaceStyle.color.clone(),
    emissive: surfaceStyle.emissive.clone(),
    transparent,
    opacity,
    alphaTest: transparent ? (material.alphaTest ?? 0.01) : 0,
    side: material.side ?? THREE.FrontSide,
    vertexColors: material.vertexColors === true,
    flatShading: material.flatShading === true,
    map: material.map ?? null,
    emissiveMap: material.emissiveMap ?? null,
    aoMap: material.aoMap ?? null,
    metalness: surfaceStyle.metalness,
    roughness: surfaceStyle.roughness,
  });
}

function prepareCityRoot(root, stageStyle) {
  root.name = "FuturisticLowPolyCity";
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const bounds = new THREE.Box3().setFromObject(child);
    const surfaceStyle = buildSciFiSurfaceStyle(child.name, bounds, stageStyle);
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const converted = materials.map((material) => convertMaterial(material, surfaceStyle));
    child.material = Array.isArray(child.material) ? converted : converted[0];
  });
}

function centerAndGround(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(root);
  const size = normalizedBox.getSize(new THREE.Vector3());

  return {
    min: normalizedBox.min.toArray(),
    max: normalizedBox.max.toArray(),
    size: size.toArray(),
  };
}

async function main() {
  const sourceBuffer = await fs.readFile(sourcePath);
  const stageStyle = await loadStageStyleConfig();
  const loader = new FBXLoader();
  const root = loader.parse(
    toArrayBuffer(sourceBuffer),
    `${path.dirname(sourcePath).replace(/\\/g, "/")}/`,
  );

  prepareCityRoot(root, stageStyle);
  const bounds = centerAndGround(root);

  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(root, {
    binary: true,
    onlyVisible: false,
    trs: false,
  });

  await fs.writeFile(outputPath, Buffer.from(glb));

  console.log(
    JSON.stringify(
      {
        sourcePath,
        outputPath,
        byteLength: Buffer.from(glb).byteLength,
        normalizedBounds: bounds,
        recommendedScale: 0.004,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
