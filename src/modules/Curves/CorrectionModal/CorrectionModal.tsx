import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Tabs, Space, Image, Divider } from "antd";
import type { TabsProps } from "antd";
import { useLayers, type Layer } from "../../../contexts/LayersContext";
import {
  getAlphaHistogram,
  getGrayscaleHistogram,
  getRGBHistograms,
} from "../../../utils/histogram";
import { isGrayscaleImage } from "../../../utils/isGrayscale";
import { applyCurvesCorrection } from "../../../utils/correction";
import { imageDataToURL } from "../../../utils/imageDataToURL";
import { CurvesEditor } from "../CurvesEditor/CurvesEditor";

type CorrectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Point = { input: number; output: number };

export function CorrectionModal({ isOpen, onClose }: CorrectionModalProps) {
  const title = "Градационная коррекция";
  const { layers, activeLayerId, setOriginalImageData } = useLayers();

  const [layer, setLayer] = useState<Layer | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imagePreviewURL, setImagePreviewURL] = useState<string | null>(null);

  const [curveR, setCurveR] = useState<[Point, Point]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);
  const [curveG, setCurveG] = useState<[Point, Point]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);
  const [curveB, setCurveB] = useState<[Point, Point]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);
  const [curveGray, setCurveGray] = useState<[Point, Point]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);
  const [curveAlpha, setCurveAlpha] = useState<[Point, Point]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 },
  ]);

  const [isColor, setIsColor] = useState<boolean | null>(null);

  const histograms = useMemo(() => {
    if (!imageData) return null;

    const alpha = getAlphaHistogram(imageData);
    const gray = getGrayscaleHistogram(imageData);
    const { r: hr, g: hg, b: hb } = getRGBHistograms(imageData);

    setIsColor(!isGrayscaleImage(imageData));

    return { alpha, gray, r: hr, g: hg, b: hb };
  }, [imageData]);

  const createPreview = () => {
    if (!imageData) return;

    const newImgData = isColor
      ? applyCurvesCorrection(imageData, {
          r: curveR,
          g: curveG,
          b: curveB,
          alpha: curveAlpha,
        })
      : applyCurvesCorrection(imageData, {
          gray: curveGray,
          alpha: curveAlpha,
        });

    setImagePreviewURL(imageDataToURL(newImgData));
  };

  const applyCorrection = () => {
    if (!imageData || activeLayerId === null) return;

    const newImgData = isColor
      ? applyCurvesCorrection(imageData, {
          r: curveR,
          g: curveG,
          b: curveB,
          alpha: curveAlpha,
        })
      : applyCurvesCorrection(imageData, {
          gray: curveGray,
          alpha: curveAlpha,
        });

    setOriginalImageData(activeLayerId, newImgData);
    onClose();
  };

  const reset = () => {
    setCurveR([
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ]);
    setCurveG([
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ]);
    setCurveB([
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ]);
    setCurveGray([
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ]);
    setCurveAlpha([
      { input: 0, output: 0 },
      { input: 255, output: 255 },
    ]);
    setImagePreviewURL(null);
  };

  useEffect(() => {
    if (activeLayerId !== null) {
      const layer = layers.find((l) => l.id === activeLayerId);
      setLayer(layer || null);
    } else {
      setLayer(null);
    }
  }, [activeLayerId, layers]);

  useEffect(() => {
    if (layer) {
      setImageData(layer.originalImageData);
    } else {
      setImageData(null);
    }
  }, [layer]);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]);

  const tabItems: TabsProps["items"] = useMemo(() => {
    if (!histograms) return [];

    if (isColor) {
      return [
        {
          key: "rgb",
          label: "RGB",
          children: (
            <>
              <CurvesEditor
                histogram={histograms.r}
                channel="r"
                controlPoints={curveR}
                onChange={setCurveR}
              />
              <CurvesEditor
                histogram={histograms.g}
                channel="g"
                controlPoints={curveG}
                onChange={setCurveG}
              />
              <CurvesEditor
                histogram={histograms.b}
                channel="b"
                controlPoints={curveB}
                onChange={setCurveB}
              />
            </>
          ),
        },
        {
          key: "alpha",
          label: "Alpha",
          children: (
            <CurvesEditor
              histogram={histograms.alpha}
              channel="a"
              controlPoints={curveAlpha}
              onChange={setCurveAlpha}
            />
          ),
        },
      ];
    }

    return [
      {
        key: "gray",
        label: "Grayscale",
        children: (
          <CurvesEditor
            histogram={histograms.gray}
            channel="l"
            controlPoints={curveGray}
            onChange={setCurveGray}
          />
        ),
      },
      {
        key: "alpha",
        label: "Alpha",
        children: (
          <CurvesEditor
            histogram={histograms.alpha}
            channel="a"
            controlPoints={curveAlpha}
            onChange={setCurveAlpha}
          />
        ),
      },
    ];
  }, [histograms, isColor, curveR, curveG, curveB, curveGray, curveAlpha]);

  return (
    <Modal
      title={title}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ display: "flex" }}
    >
      {imageData && histograms ? (
        <>
          <Tabs
            defaultActiveKey="rgb"
            style={{ display: "flex" }}
            items={tabItems}
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={reset}>Сброс</Button>
            <Button onClick={createPreview}>Предпросмотр</Button>
            <Button type="primary" onClick={applyCorrection}>
              Применить
            </Button>
          </Space>
          <Divider />
          {imagePreviewURL && (
            <Image
              src={imagePreviewURL}
              alt="Preview"
              style={{ marginTop: 16, maxHeight: 300 }}
              preview={false}
            />
          )}
        </>
      ) : (
        <p>Изображение не загружено</p>
      )}
    </Modal>
  );
}