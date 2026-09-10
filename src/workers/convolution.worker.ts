import { applyConvolution } from "../utils/convolution";

self.onmessage = (e) => {
  const { imageData, kernel, mode } = e.data;

  const result = applyConvolution(imageData, kernel, mode);

  self.postMessage(result);
};