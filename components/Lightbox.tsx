import React from "react";
import Image from "next/image";

interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) => {
  if (!images || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full h-[90vh] bg-white p-4 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full">
          <Image
            src={images[currentIndex]}
            alt="Enlarged view"
            layout="fill"
            objectFit="contain"
            className="rounded-lg"
          />
        </div>
        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              onClick={onPrev}
            >
              ←
            </button>
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              onClick={onNext}
            >
              →
            </button>
          </>
        )}
        <button
          className="absolute top-2 right-2 text-black bg-white rounded-full w-8 h-8 flex items-center justify-center border border-black"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Lightbox;

export const parseImagesFromMarkdown = (content: string): string[] => {
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const matches = content.match(imageRegex);
  if (matches) {
    return matches.map((match) => {
      const [, src] = /!\[.*?\]\((.*?)\)/.exec(match) || [];
      return src;
    });
  }
  return [];
};
