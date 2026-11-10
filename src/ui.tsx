import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  Minus,
  Plus,
  Play,
  LoaderCircle,
  Check,
  ArrowRight,
  ShoppingBag,
  ChefHat,
} from "lucide-react";
import type { Product, Order } from "./types";
import { money, dateTime, statusLabels } from "./api";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="Perfect Lanches — início"
    >
      <img
        src="/media/logo.webp"
        width="64"
        height="64"
        alt="Logomarca Perfect Lanches, dourada sobre fundo preto"
      />
      <span>
        Perfect
        <span className="brand-bottom">
          LANCHES <i>feito com carinho</i>
        </span>
      </span>
    </a>
  );
}
export function Spinner() {
  return <LoaderCircle size={18} className="spin" aria-label="Carregando" />;
}
export function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p className="error-message" role="alert">
      {text}
    </p>
  ) : null;
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <ShoppingBag size={34} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Modal({
  children,
  title,
  onClose,
  kind = "",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  kind?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const focused = document.activeElement as HTMLElement;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog.close();
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${kind}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={21} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
export function Stepper({
  value,
  onChange,
  allowZero = false,
}: {
  value: number;
  onChange: (n: number) => void;
  allowZero?: boolean;
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={value <= (allowZero ? 0 : 1)}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= 20}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function ProductMedia({
  product,
  className = "",
  eager = false,
}: {
  product: Product;
  className?: string;
  eager?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function start() {
    if (!reduced() && product.video && !failed) setActive(true);
  }
  function stop() {
    video.current?.pause();
    setActive(false);
  }
  useEffect(() => {
    if (active) video.current?.play().catch(() => setActive(false));
  }, [active]);
  return (
    <div
      className={`product-media ${className} ${active ? "is-playing" : ""}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      <img
        src={product.image}
        alt={product.name}
        width="800"
        height="620"
        loading={eager ? "eager" : "lazy"}
      />
      {active && !failed && (
        <video
          ref={video}
          src={product.video}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          onError={() => {
            setFailed(true);
            setActive(false);
          }}
        />
      )}
      {product.video && (
        <span className="media-preview">
          <Play size={10} fill="currentColor" />{" "}
          {active ? "De pertinho" : "Dê uma espiada"}
        </span>
      )}
    </div>
  );
}
export function ProductCard({
  product,
  onOpen,
  onAdd,
  index,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
  index: number;
}) {
  return (
    <article className="product-card">
      <button
        className="product-photo-button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <ProductMedia product={product} eager={index < 3} />
        <span className="photo-corner">
          <ArrowRight size={18} />
        </span>
      </button>
      <div className="product-card-body">
        <span className={`product-badge ${product.featured ? "featured" : ""}`}>
          {product.featured && <span>✦</span>}
          {product.badge || "Feito na hora"}
        </span>
        <button className="product-name" onClick={onOpen}>
          <h4>{product.name}</h4>
        </button>
        <p>{product.description}</p>
        <div className="product-price-row">
          <strong>{money(product.price)}</strong>
          <button
            className="add-product"
            aria-label={`Adicionar ${product.name} ao carrinho`}
            onClick={onAdd}
          >
            <Plus size={19} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
    </article>
  );
}
export function OrderCard({
  order,
  onSelect,
}: {
  order: Order;
  onSelect: () => void;
}) {
  return (
    <button className="order-card" onClick={onSelect}>
      <div className="order-icon">
        <ChefHat size={23} />
      </div>
      <div>
        <strong>Pedido #{order.number}</strong>
        <span>
          {dateTime(order.createdAt)} ·{" "}
          {order.items.reduce((n, i) => n + i.quantity, 0)} itens
        </span>
        <span className={`status status-${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      <div className="order-card-end">
        <strong>{money(order.total)}</strong>
        <ArrowRight size={17} />
      </div>
    </button>
  );
}
export function OrderProgress({ order }: { order: Order }) {
  const steps: Order["status"][] = [
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
  ];
  const position = steps.indexOf(order.status);
  return (
    <ol className="order-progress">
      {steps.map((step, i) => (
        <li key={step} className={position >= i ? "done" : ""}>
          <span>{position >= i ? <Check size={15} /> : i + 1}</span>
          <small>
            {step === "out_for_delivery" && order.deliveryType === "pickup"
              ? "Pronto para retirar"
              : statusLabels[step]}
          </small>
        </li>
      ))}
    </ol>
  );
}
