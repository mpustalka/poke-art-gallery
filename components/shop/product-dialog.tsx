"use client";
import { useEffect, useRef, useState } from "react";
import { money, digitalDeliveryNote } from "@/lib/commerce";
import type { Product } from "@/lib/commerce";
export default function ProductDialog({
  product,
  initialImage,
  onClose,
  onAdd,
}: {
  product: Product;
  initialImage: string;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [index, setIndex] = useState(
      Math.max(0, product.images.indexOf(initialImage)),
    ),
    [size, setSize] = useState(product.variants[0].id);
  useEffect(() => {
    const d = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d?.showModal();
    return () => {
      d?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  const move = (n: number) =>
    setIndex((i) => (i + n + product.images.length) % product.images.length);
  const variant = product.variants.find((v) => v.id === size)!;
  return (
    <dialog
      ref={dialog}
      className="shop-dialog"
      aria-labelledby={"artwork-" + product.id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <div className="shop-dialog-inner">
        <button
          type="button"
          className="shop-dialog-close shop-button shop-secondary"
          onClick={onClose}
          aria-label="Close artwork gallery"
        >
          Close ×
        </button>
        <div className="shop-dialog-grid">
          <div>
            <img
              className="shop-dialog-image"
              src={product.images[index]}
              alt={`${product.title}, image ${index + 1}`}
            />
            <div className="shop-row shop-between shop-dialog-controls">
              <button
                className="shop-button shop-secondary"
                onClick={() => move(-1)}
                disabled={product.images.length < 2}
                aria-label="Previous image"
              >
                ←
              </button>
              <span aria-live="polite">
                Image {index + 1} of {product.images.length}
              </span>
              <button
                className="shop-button shop-secondary"
                onClick={() => move(1)}
                disabled={product.images.length < 2}
                aria-label="Next image"
              >
                →
              </button>
            </div>
            <div className="shop-thumbs">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  aria-label={`View gallery image ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          </div>
          <div className="shop-form">
            <span className="shop-eyebrow">A closer look</span>
            <h2 id={"artwork-" + product.id}>{product.title}</h2>
            <p className="shop-preserve">{product.description}</p>
            <label>
              Choose a size
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {money(v.price)}
                  </option>
                ))}
              </select>
            </label>
            <strong className="shop-price">{money(variant.price)}</strong>
            <button
              className="shop-button"
              onClick={() => {
                onAdd(size);
                onClose();
              }}
            >
              Add to order
            </button>
            <p className="shop-muted">
              {variant.delivery === "digital"
                ? digitalDeliveryNote
                : "Images show this listing’s artwork and product details. Check the selected format for framing options. Shipping and applicable tax are confirmed before payment."}
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
