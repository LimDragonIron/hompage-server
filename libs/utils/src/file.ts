// 파일 이름 전략: 파일명 앞에 타임스탬프, 길이 제한, 확장자 유지
export const fileNameStrategy = (name: string) => {
  const MAX_FILENAME_LENGTH = 30;
  const lastDotIndex = name.lastIndexOf('.');
  let baseName = name;
  let extension = '';
  if (lastDotIndex !== -1) {
    baseName = name.substring(0, lastDotIndex);
    extension = name.substring(lastDotIndex);
  }
  const timestampPrefix = `${new Date().getTime()}_`;
  const availableLengthForBaseName =
    MAX_FILENAME_LENGTH - timestampPrefix.length - extension.length;
  let truncatedBaseName = baseName;
  if (availableLengthForBaseName < baseName.length) {
    truncatedBaseName = baseName.substring(0, availableLengthForBaseName);
  }
  return `${timestampPrefix}${truncatedBaseName}${extension}`;
};

// 확장자 추출 (소문자, 점 없음)
export function getExtension(name = '') {
  if (!name) {
    throw new Error('Invalid filename');
  }
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase().replace(/^\./, '');
}

// 파일 타입 분류 (image, video, audio, document, ...)
export function getFileType(extension: string): string {
  const imageExtensions = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'webp',
    'svg',
    'ico',
  ];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
  const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'wma'];
  const documentExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'rtf',
    'odt',
    'ods',
    'odp',
  ];
  const compressedExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
  const codeExtensions = [
    'js',
    'ts',
    'jsx',
    'tsx',
    'html',
    'css',
    'scss',
    'less',
    'json',
    'xml',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'go',
    'rb',
    'php',
    'swift',
    'kt',
    'yml',
    'yaml',
    'sh',
  ];

  const normalizedExtension = extension.toLowerCase().replace(/^\./, '');

  if (imageExtensions.includes(normalizedExtension)) {
    return 'image';
  } else if (videoExtensions.includes(normalizedExtension)) {
    return 'video';
  } else if (audioExtensions.includes(normalizedExtension)) {
    return 'audio';
  } else if (documentExtensions.includes(normalizedExtension)) {
    return 'document';
  } else if (compressedExtensions.includes(normalizedExtension)) {
    return 'compressed';
  } else if (codeExtensions.includes(normalizedExtension)) {
    return 'code';
  } else {
    return 'other';
  }
}
