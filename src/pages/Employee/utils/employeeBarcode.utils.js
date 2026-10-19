import JsBarcode from 'jsbarcode';

export const renderEmployeeBarcode = (svg, employeeCode, options = {}) => {
  const code = String(employeeCode ?? '').trim();
  if (!svg || !code) return null;

  JsBarcode(svg, code, {
    format: 'CODE128',
    displayValue: false,
    width: options.width ?? 3,
    height: options.height ?? 80,
    margin: options.margin ?? 10,
  });
  return svg;
};

export const createEmployeeBarcodeSvg = (employeeCode, options = {}) => {
  const code = String(employeeCode ?? '').trim();
  if (!code) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  return renderEmployeeBarcode(svg, code, options);
};

export const createEmployeeBarcodePng = async (employeeCode, options = {}) => {
  const svg = createEmployeeBarcodeSvg(employeeCode, options);
  if (!svg) return null;

  const svgWidth = Number.parseFloat(svg.getAttribute('width'));
  const svgHeight = Number.parseFloat(svg.getAttribute('height'));
  if (!Number.isFinite(svgWidth) || !Number.isFinite(svgHeight)) {
    throw new Error('Generated barcode has invalid dimensions.');
  }

  const svgUrl = URL.createObjectURL(new Blob(
    [new XMLSerializer().serializeToString(svg)],
    { type: 'image/svg+xml;charset=utf-8' },
  ));

  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(svgWidth * scale);
    canvas.height = Math.ceil(svgHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create a canvas for the barcode.');

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Unable to encode the barcode as PNG.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};
