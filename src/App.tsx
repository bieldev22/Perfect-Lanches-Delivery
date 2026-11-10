import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Flame,
  Heart,
  MapPin,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Trash2,
  Truck,
  UserRound,
  UtensilsCrossed,
  Sandwich,
  CupSoda,
  Cookie,
  X,
} from "lucide-react";
import type {
  Bootstrap,
  CartItem,
  Category,
  Customer,
  Order,
  Product,
  User,
} from "./types";
import { api, money, statusLabels } from "./api";
import {
  Brand,
  Empty,
  ErrorMessage,
  Modal,
  OrderProgress,
  ProductCard,
  ProductMedia,
  Spinner,
  Stepper,
} from "./ui";
import { Account } from "./Account";
import menu from "../server/menu.json";

const Admin = lazy(() => import("./Admin"));
const categoryList = [
  { id: "all", label: "Todo o cardápio", icon: UtensilsCrossed },
  { id: "burgers", label: "Hambúrgueres", icon: Sandwich },
  { id: "fries", label: "Batatas", icon: Flame },
  { id: "drinks", label: "Bebidas", icon: CupSoda },
  { id: "sweets", label: "Doces", icon: Cookie },
] as const;
const initialStore = {
  name: "Perfect Lanches",
  tagline: "O lanche perfeito para você.",
  isOpen: true,
  deliveryMinutes: "35–50",
  minimumOrder: 2000,
  hours: "Todos os dias, 18h às 23h",
  pickupAddress: "Aldeota, Fortaleza — endereço a confirmar",
  regions: [
    { name: "Aldeota", fee: 500 },
    { name: "Meireles", fee: 700 },
    { name: "Joaquim Távora", fee: 600 },
    { name: "Dionísio Torres", fee: 600 },
    { name: "Varjota", fee: 700 },
    { name: "Centro", fee: 800 },
  ],
};
function readCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem("perfect-cart") || "[]");
    return Array.isArray(saved)
      ? saved
          .filter(
            (i: CartItem) =>
              typeof i.id === "string" &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 20,
          )
          .slice(0, 30)
          .map((i) => ({
            id: i.id,
            quantity: i.quantity,
            note: typeof i.note === "string" ? i.note.slice(0, 200) : "",
          }))
      : [];
  } catch {
    return [];
  }
}
const clean = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function App() {
  const [boot, setBoot] = useState<Bootstrap>({
    products: menu as Product[],
    store: initialStore,
    user: null,
    csrf: "",
    demo: true,
    paymentMode: "demo",
    aiEnabled: false,
  });
  const [ready, setReady] = useState(false),
    [serverError, setServerError] = useState("");
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [category, setCategory] = useState<string>("all"),
    [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    "product" | "cart" | "checkout" | "payment" | "store" | null
  >(null);
  const [selected, setSelected] = useState<Product | null>(null),
    [order, setOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState("");
  const [idempotency, setIdempotency] = useState(() => crypto.randomUUID());
  const route = window.location.pathname;
  async function refresh() {
    try {
      const data = await api<Bootstrap>("/bootstrap");
      setBoot(data);
      setReady(true);
      setServerError("");
    } catch (error) {
      setServerError((error as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    localStorage.setItem("perfect-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timeout);
  }, [toast]);
  const cartLines = useMemo(
    () =>
      cart
        .map((i) => ({
          ...i,
          product: boot.products.find((p) => p.id === i.id),
        }))
        .filter((i): i is CartItem & { product: Product } =>
          Boolean(i.product),
        ),
    [cart, boot.products],
  );
  const subtotal = cartLines.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );
  const count = cartLines.reduce((sum, i) => sum + i.quantity, 0);
  function setUser(user: User | null) {
    setBoot((value) => ({ ...value, user }));
  }
  function add(product: Product, quantity = 1, note = "") {
    setIdempotency(crypto.randomUUID());
    setCart((items) => {
      const existing = items.find((i) => i.id === product.id);
      return existing
        ? items.map((i) =>
            i.id === product.id
              ? {
                  ...i,
                  quantity: Math.min(20, i.quantity + quantity),
                  note: note || i.note,
                }
              : i,
          )
        : [...items, { id: product.id, quantity, note }];
    });
    setToast(`${product.name} na sua sacola!`);
  }
  function changeQuantity(id: string, quantity: number) {
    setIdempotency(crypto.randomUUID());
    setCart((items) =>
      quantity === 0
        ? items.filter((i) => i.id !== id)
        : items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  }
  function openProduct(product: Product) {
    setSelected(product);
    setModal("product");
  }
  function viewOrder(value: Order) {
    setOrder(value);
    setModal("payment");
  }
  const filtered = boot.products.filter(
    (p) =>
      p.active &&
      (category === "all" || category === p.category) &&
      clean(`${p.name} ${p.description} ${p.ingredients.join(" ")}`).includes(
        clean(search),
      ),
  );
  const categoryGroups = (
    category === "all"
      ? categoryList.filter((c) => c.id !== "all")
      : categoryList.filter((c) => c.id === category)
  ).filter((c) => filtered.some((p) => p.category === c.id));
  const close = () => setModal(null);
  const showCart = () => setModal("cart");

  return (
    <div className={route === "/admin" ? "app admin-app" : "app"}>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      {route !== "/admin" && (
        <>
          <div className="announcement">
            <span>Feito com capricho. Entregue com carinho.</span>
            <span className="announcement-right">
              <MapPin size={12} /> Fortaleza, CE{" "}
              <span className="announcement-dot">•</span>{" "}
              {boot.demo ? "Delivery em demonstração" : "Peça pelo nosso site"}
            </span>
          </div>
          <header className="site-header">
            <div className="container header-inner">
              <Brand />
              <nav aria-label="Navegação principal">
                <a className={route === "/" ? "active" : ""} href="/#cardapio">
                  Cardápio
                </a>
                <button onClick={() => setModal("store")}>A casa</button>
                <a href="/conta">Meus pedidos</a>
              </nav>
              <div className="header-actions">
                <a href="/conta" className="account-link" aria-label="Minha conta">
                  <UserRound size={19} />
                  <span>
                    {boot.user
                      ? `Olá, ${boot.user.name.split(" ")[0]}`
                      : "Minha conta"}
                  </span>
                </a>
                <button
                  className="cart-button"
                  onClick={showCart}
                  aria-label={`Abrir sacola com ${count} itens`}
                >
                  <ShoppingBag size={18} />
                  <span>Sacola</span>
                  <b>{count}</b>
                </button>
              </div>
            </div>
          </header>
        </>
      )}
      {serverError && (
        <div className="connection-error" role="alert">
          Não conseguimos conectar ao delivery.{" "}
          <button onClick={refresh}>Tentar novamente</button>
        </div>
      )}
      <main id="main">
        {route === "/" && (
          <>
            <section className="hero">
              <div className="container hero-inner">
                <img
                  className="hero-photo"
                  src="/media/hero.webp"
                  alt="Hambúrguer artesanal com duas carnes, cheddar, bacon e batatas douradas"
                  width="1536"
                  height="1024"
                  fetchPriority="high"
                />
                <div className="hero-shade" />
                <div className="hero-copy">
                  <div className="eyebrow hero-eyebrow">
                    <span /> BOM DE VER. MELHOR DE MORDER.
                  </div>
                  <h1>
                    Seu dia merece
                    <br />
                    um lanche
                    <br />
                    <em>perfeito.</em>
                  </h1>
                  <p>
                    Pão macio, carne no ponto e muito capricho.
                    <br />O seu próximo favorito está aqui.
                  </p>
                  <a className="button button-gold hero-cta" href="#cardapio">
                    Escolher meu lanche <ArrowUpRight size={20} />
                  </a>
                  <div className="hero-footnote">
                    <Heart size={14} /> Feito na hora. Do nosso jeito, para
                    você.
                  </div>
                </div>
                <div className="hero-product-tag">
                  <span className="tag-star">✦</span>
                  <div>
                    <span>CONHEÇA O DOUBLE PERFECT</span>
                    <strong>Duas carnes. Sabor em dobro.</strong>
                  </div>
                  <button
                    onClick={() => {
                      const p = boot.products.find(
                        (p) => p.id === "double-perfect",
                      );
                      if (p) openProduct(p);
                    }}
                    aria-label="Conhecer Double Perfect"
                  >
                    <ArrowUpRight size={22} />
                  </button>
                </div>
                <span className="hero-photo-note">Imagem ilustrativa</span>
              </div>
            </section>
            <div className="store-info">
              <div className="container store-info-inner">
                <button className="open-info" onClick={() => setModal("store")}>
                  <span
                    className={`status-dot ${boot.store.isOpen ? "" : "closed"}`}
                  />
                  <div>
                    <strong>
                      {boot.store.isOpen
                        ? "Aberto para pedidos"
                        : "Loja fechada"}
                    </strong>
                    <span>
                      Confira nossos horários <ChevronDown size={11} />
                    </span>
                  </div>
                </button>
                <div>
                  <Clock3 size={22} />
                  <div>
                    <strong>{boot.store.deliveryMinutes} min</strong>
                    <span>Estimativa de entrega</span>
                  </div>
                </div>
                <div>
                  <Truck size={23} />
                  <div>
                    <strong>
                      A partir de{" "}
                      {money(Math.min(...boot.store.regions.map((r) => r.fee)))}
                    </strong>
                    <span>Entrega com todo o cuidado</span>
                  </div>
                </div>
                <button onClick={() => setModal("store")}>
                  <MapPin size={23} />
                  <div>
                    <strong>Aldeota, Fortaleza</strong>
                    <span>
                      Veja os bairros atendidos <ArrowUpRight size={11} />
                    </span>
                  </div>
                </button>
              </div>
            </div>
            <section id="cardapio" className="menu-section container">
              <div className="section-top">
                <div>
                  <span className="eyebrow warm-eyebrow">
                    UM CAPRICHO EM CADA ESCOLHA
                  </span>
                  <h2>
                    O que vai ser hoje<span>?</span>
                  </h2>
                </div>
                <div className="menu-intro">
                  <span className="little-star">✦</span>
                  <p>
                    Da primeira mordida
                    <br />
                    ao último pedacinho.
                  </p>
                </div>
              </div>
              <div className="menu-toolbar">
                <div
                  className="category-tabs"
                  role="group"
                  aria-label="Categorias do cardápio"
                >
                  {categoryList.map((c) => (
                    <button
                      key={c.id}
                      className={category === c.id ? "selected" : ""}
                      aria-pressed={category === c.id}
                      onClick={() => setCategory(c.id)}
                    >
                      <c.icon size={17} />
                      <span>{c.label}</span>
                      {category === c.id && (
                        <small>
                          {
                            boot.products.filter(
                              (p) => c.id === "all" || p.category === c.id,
                            ).length
                          }
                        </small>
                      )}
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Busque seu favorito"
                    aria-label="Buscar produtos"
                  />
                  {search && (
                    <button
                      aria-label="Limpar busca"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
              {search && (
                <p className="search-results" aria-live="polite">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "resultado" : "resultados"} para “
                  {search}”
                </p>
              )}
              {filtered.length ? (
                categoryGroups.map((group) => (
                  <section
                    className="menu-category"
                    key={group.id}
                    aria-labelledby={`title-${group.id}`}
                  >
                    <div className="category-title">
                      <div>
                        <group.icon size={22} />
                        <h3 id={`title-${group.id}`}>{group.label}</h3>
                        <span>
                          {
                            filtered.filter((p) => p.category === group.id)
                              .length
                          }{" "}
                          opções
                        </span>
                      </div>
                      <span className="category-subtitle">
                        {group.id === "burgers"
                          ? "Artesanais. Suculentos. Irresistíveis."
                          : group.id === "fries"
                            ? "Uma crocância que faz companhia."
                            : group.id === "drinks"
                              ? "Geladinhas para acompanhar."
                              : "O final feliz do seu pedido."}
                      </span>
                    </div>
                    <div className="product-grid">
                      {filtered
                        .filter((p) => p.category === group.id)
                        .map((product, index) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            index={index}
                            onOpen={() => openProduct(product)}
                            onAdd={() => add(product)}
                          />
                        ))}
                    </div>
                  </section>
                ))
              ) : (
                <Empty
                  title="Esse sabor ainda não está por aqui"
                  description="Tente outro nome ou procure em todas as categorias."
                >
                  <button
                    className="button button-dark"
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                    }}
                  >
                    Ver todo o cardápio
                  </button>
                </Empty>
              )}
              <div className="menu-note">
                <ShieldCheck size={15} />
                <span>
                  Cardápio criado para este projeto. Fotos, embalagens, preços e
                  prévias de zoom são ilustrativos.
                </span>
              </div>
            </section>
            <section className="how-it-works">
              <div className="container how-inner">
                <div>
                  <span className="eyebrow warm-eyebrow">
                    DO SEU JEITO, SEM COMPLICAÇÃO
                  </span>
                  <h2>Seu Perfect, em poucos passos.</h2>
                </div>
                <ol>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>Escolha seu favorito</strong>
                      <p>Monte a sacola e conte seus detalhes.</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>Finalize com Pix</strong>
                      <p>Um código gerado para o seu pedido.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>A gente capricha</strong>
                      <p>Acompanhe cada etapa na sua conta.</p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>
          </>
        )}
        {route === "/conta" && (
          <Account
            boot={boot}
            ready={ready}
            onUser={setUser}
            onOrder={viewOrder}
            onReorder={(o) => {
              for (const item of o.items) {
                const product = boot.products.find((p) => p.id === item.id);
                if (product) add(product, item.quantity, item.note);
              }
              showCart();
            }}
          />
        )}
        {route === "/admin" && (
          <Suspense
            fallback={
              <div className="page-loading">
                <Spinner /> Preparando seu painel…
              </div>
            }
          >
            <Admin boot={boot} ready={ready} onUser={setUser} />
          </Suspense>
        )}
        {route === "/privacidade" && (
          <div className="container privacy-page">
            <span className="eyebrow warm-eyebrow">SEUS DADOS</span>
            <h1>Privacidade com clareza.</h1>
            <p>
              Este delivery utiliza nome, contato, endereço de entrega e
              histórico para processar seus pedidos e permitir o acompanhamento.
              O cadastro é opcional. A sacola fica salva neste navegador e a
              sessão usa um cookie necessário, protegido contra acesso por
              JavaScript.
            </p>
            <h2>Pagamentos e análises</h2>
            <p>
              No modo Mercado Pago, os dados necessários para a cobrança são
              enviados ao provedor. O CPF é usado apenas nessa solicitação e não
              fica salvo na base de pedidos. A análise por IA recebe somente
              totais agregados, sem nomes, e-mails, telefones ou endereços
              completos.
            </p>
            <h2>Antes da operação real</h2>
            <p>
              Este projeto está em demonstração. A empresa deve validar os dados
              comerciais, os prazos de retenção, o canal para solicitações de
              acesso e exclusão e esta política antes de iniciar a operação. Não
              use dados pessoais reais nos testes.
            </p>
            <a className="button button-dark" href="/">
              Voltar ao cardápio <ArrowRight size={18} />
            </a>
          </div>
        )}
      </main>
      {route !== "/admin" && (
        <footer className="site-footer">
          <div className="container footer-main">
            <div>
              <Brand />
              <p>
                O lanche perfeito para você.
                <br />E um capricho que dá para sentir.
              </p>
            </div>
            <div>
              <strong>FEITO EM FORTALEZA</strong>
              <p>Aldeota · Fortaleza, CE</p>
              <a
                href="https://www.instagram.com/perfectlanches_/"
                target="_blank"
                rel="noreferrer"
              >
                @perfectlanches_ <ArrowUpRight size={13} />
              </a>
            </div>
            <div>
              <strong>FICA À VONTADE</strong>
              <a href="/#cardapio">Nosso cardápio</a>
              <a href="/conta">Minha conta e pedidos</a>
              <button onClick={() => setModal("store")}>
                Entregas e horários
              </button>
            </div>
            <div className="footer-pix">
              <CreditCard size={24} />
              <strong>A gente aceita Pix</strong>
              <span>Praticidade no seu pedido.</span>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} Perfect Lanches · Feito com carinho.
            </span>
            <div>
              <a href="/privacidade">Privacidade</a>
              <a href="/admin">
                Área administrativa <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </footer>
      )}
      {count > 0 && route !== "/admin" && (
        <button className="mobile-cart" onClick={showCart}>
          <span>
            <ShoppingBag size={20} />
            <b>{count}</b> Ver minha sacola
          </span>
          <strong>
            {money(subtotal)} <ArrowRight size={16} />
          </strong>
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button
            onClick={() => {
              setToast("");
              showCart();
            }}
          >
            Ver sacola <ArrowRight size={14} />
          </button>
          <button
            className="toast-close"
            onClick={() => setToast("")}
            aria-label="Fechar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal === "product" && selected && (
        <ProductDetails
          key={selected.id}
          product={selected}
          onClose={close}
          onAdd={(quantity, note) => {
            add(selected, quantity, note);
            close();
          }}
        />
      )}
      {modal === "cart" && (
        <Modal title="Sua sacola" onClose={close} kind="drawer">
          <div className="drawer-heading">
            <span className="eyebrow warm-eyebrow">SEU MOMENTO PERFECT</span>
            <h2>
              Sua sacola <span>({count})</span>
            </h2>
          </div>
          {cartLines.length ? (
            <>
              <div className="cart-lines">
                {cartLines.map((line) => (
                  <div className="cart-line" key={line.id}>
                    <img
                      src={line.product.image}
                      alt=""
                      width="82"
                      height="82"
                    />
                    <div>
                      <strong>{line.product.name}</strong>
                      <span>{money(line.product.price)}</span>
                      {line.note && <small>{line.note}</small>}
                      <Stepper
                        value={line.quantity}
                        onChange={(n) => changeQuantity(line.id, n)}
                      />
                    </div>
                    <div className="cart-line-end">
                      <button
                        className="icon-btn"
                        aria-label={`Remover ${line.product.name}`}
                        onClick={() => changeQuantity(line.id, 0)}
                      >
                        <Trash2 size={16} />
                      </button>
                      <strong>
                        {money(line.product.price * line.quantity)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
              <button className="continue-shopping" onClick={close}>
                <Plus size={16} /> Adicionar mais delícias
              </button>
              <div className="drawer-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <p>Taxa de entrega calculada no próximo passo.</p>
                {subtotal < boot.store.minimumOrder && (
                  <p className="minimum-note">
                    Faltam {money(boot.store.minimumOrder - subtotal)} para o
                    pedido mínimo.
                  </p>
                )}
                <button
                  className="button button-gold full-width"
                  disabled={
                    !ready ||
                    subtotal < boot.store.minimumOrder ||
                    !boot.store.isOpen
                  }
                  onClick={() => setModal("checkout")}
                >
                  {!boot.store.isOpen
                    ? "Loja fechada para pedidos"
                    : "Continuar pedido"}
                  <ArrowRight size={19} />
                </button>
                <span className="secure-note">
                  <ShieldCheck size={13} /> Seu pedido, cuidado em cada detalhe.
                </span>
              </div>
            </>
          ) : (
            <Empty
              title="Sua sacola está esperando"
              description="Um burger caprichado já seria um ótimo começo."
            >
              <button className="button button-gold" onClick={close}>
                Explorar o cardápio <ArrowRight size={17} />
              </button>
            </Empty>
          )}
        </Modal>
      )}
      {modal === "checkout" && (
        <Checkout
          boot={boot}
          lines={cartLines}
          subtotal={subtotal}
          idempotencyKey={idempotency}
          onBack={showCart}
          onClose={close}
          onSuccess={(value) => {
            setCart([]);
            setIdempotency(crypto.randomUUID());
            setOrder(value);
            setModal("payment");
          }}
        />
      )}
      {modal === "payment" && order && (
        <Payment order={order} onUpdate={setOrder} onClose={close} />
      )}
      {modal === "store" && (
        <Modal
          title="Sobre a Perfect Lanches"
          onClose={close}
          kind="store-modal"
        >
          <div className="store-modal-head">
            <img
              src="/media/logo.webp"
              alt="Perfect Lanches"
              width="90"
              height="90"
            />
            <span className="eyebrow warm-eyebrow">
              O LANCHE PERFEITO PARA VOCÊ
            </span>
            <h2>Capricho é a nossa receita.</h2>
            <p>
              A Perfect Lanches é da Aldeota, em Fortaleza. Aqui, cada detalhe
              do seu lanche merece atenção.
            </p>
          </div>
          <div className="store-details">
            <div>
              <Clock3 size={21} />
              <div>
                <strong>Horários</strong>
                <p>{boot.store.hours}</p>
              </div>
            </div>
            <div>
              <MapPin size={21} />
              <div>
                <strong>Retirada na loja</strong>
                <p>{boot.store.pickupAddress}</p>
              </div>
            </div>
            <div>
              <ShoppingBag size={21} />
              <div>
                <strong>Pedido mínimo</strong>
                <p>{money(boot.store.minimumOrder)}</p>
              </div>
            </div>
          </div>
          <h3>Chegamos até você</h3>
          <div className="regions-list">
            {boot.store.regions.map((r) => (
              <div key={r.name}>
                <span>{r.name}</span>
                <strong>{money(r.fee)}</strong>
              </div>
            ))}
          </div>
          <p className="fine-print">
            {boot.demo
              ? "Horários, prazos e taxas sugeridos para demonstração. O endereço de retirada precisa ser confirmado pela empresa."
              : "Os prazos são estimativas e podem variar conforme a demanda."}
          </p>
          <a
            className="button button-dark full-width"
            href="https://www.instagram.com/perfectlanches_/"
            target="_blank"
            rel="noreferrer"
          >
            Conheça nosso Instagram <ArrowUpRight size={17} />
          </a>
        </Modal>
      )}
    </div>
  );
}

function ProductDetails({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (quantity: number, note: string) => void;
}) {
  const [quantity, setQuantity] = useState(1),
    [note, setNote] = useState("");
  return (
    <Modal title={product.name} onClose={onClose} kind="product-modal">
      <div className="product-detail-grid">
        <div className="product-detail-photo">
          <ProductMedia product={product} eager />
          <span>Imagem ilustrativa · prévia com aproximação</span>
        </div>
        <div className="product-detail-info">
          <span className="eyebrow warm-eyebrow">{product.badge}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <strong className="detail-price">{money(product.price)}</strong>
          <h3>O que faz esse sabor</h3>
          <div className="ingredients">
            {product.ingredients.map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
          <p className="allergens">
            <ShieldCheck size={14} />
            {product.allergens}
          </p>
          <label className="field">
            Do seu jeito <span>Alguma observação?</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Ex.: sem cebola, por favor"
            />
          </label>
          <div className="detail-add-row">
            <Stepper value={quantity} onChange={setQuantity} />
            <button
              className="button button-gold"
              onClick={() => onAdd(quantity, note)}
            >
              Adicionar <span>{money(product.price * quantity)}</span>
              <Plus size={17} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Checkout({
  boot,
  lines,
  subtotal,
  idempotencyKey,
  onClose,
  onBack,
  onSuccess,
}: {
  boot: Bootstrap;
  lines: (CartItem & { product: Product })[];
  subtotal: number;
  idempotencyKey: string;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (order: Order) => void;
}) {
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [customer, setCustomer] = useState<Customer>({
    name: boot.user?.name || "",
    email: boot.user?.email || "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    region: "",
    ...boot.user?.profile,
  });
  const [note, setNote] = useState(""),
    [cpf, setCpf] = useState("");
  const fee =
    delivery === "delivery"
      ? boot.store.regions.find((r) => r.name === customer.region)?.fee || 0
      : 0;
  const field = (name: keyof Customer, value: string) =>
    setCustomer((c) => ({ ...c, [name]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { order } = await api<{ order: Order }>("/checkout", "POST", {
        customer,
        deliveryType: delivery,
        cpf,
        note,
        idempotencyKey,
        items: lines.map(({ id, quantity, note }) => ({ id, quantity, note })),
      });
      onSuccess(order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Finalizar pedido" onClose={onClose} kind="checkout-modal">
      <div className="checkout-heading">
        <button className="text-button" onClick={onBack}>
          ← Voltar à sacola
        </button>
        <h2>Quase na sua mesa.</h2>
        <p>Só faltam os detalhes para a gente caprichar.</p>
      </div>
      <form onSubmit={submit} className="checkout-grid">
        <div className="checkout-form">
          <h3>
            <span>1</span> Como você vai receber?
          </h3>
          <div className="delivery-switch">
            <button
              type="button"
              className={delivery === "delivery" ? "selected" : ""}
              onClick={() => setDelivery("delivery")}
            >
              <Truck size={19} /> Receber em casa
            </button>
            <button
              type="button"
              className={delivery === "pickup" ? "selected" : ""}
              onClick={() => setDelivery("pickup")}
            >
              <StoreIcon size={19} /> Retirar na loja
            </button>
          </div>
          <h3>
            <span>2</span> Seus dados
          </h3>
          <div className="form-grid">
            <label className="field span-2">
              Nome completo
              <input
                value={customer.name}
                onChange={(e) => field("name", e.target.value)}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Como podemos te chamar?"
              />
            </label>
            <label className="field">
              WhatsApp com DDD
              <input
                value={customer.phone}
                onChange={(e) => field("phone", e.target.value)}
                type="tel"
                autoComplete="tel-national"
                required
                minLength={10}
                maxLength={20}
                placeholder="(85) 99999-9999"
              />
            </label>
            <label className="field">
              E-mail
              <input
                value={customer.email}
                onChange={(e) => field("email", e.target.value)}
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                placeholder="voce@email.com"
              />
            </label>
            {delivery === "delivery" ? (
              <>
                <label className="field span-2">
                  Bairro
                  <select
                    aria-label="Bairro"
                    value={customer.region}
                    onChange={(e) => field("region", e.target.value)}
                    required
                  >
                    <option value="">Selecione seu bairro</option>
                    {boot.store.regions.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name} · {money(r.fee)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Rua ou avenida
                  <input
                    value={customer.street}
                    onChange={(e) => field("street", e.target.value)}
                    required
                    minLength={3}
                    maxLength={120}
                    autoComplete="address-line1"
                    placeholder="Nome da rua"
                  />
                </label>
                <label className="field">
                  Número
                  <input
                    value={customer.number}
                    onChange={(e) => field("number", e.target.value)}
                    required
                    maxLength={15}
                    placeholder="123"
                  />
                </label>
                <label className="field span-2">
                  Complemento <span>opcional</span>
                  <input
                    value={customer.complement}
                    onChange={(e) => field("complement", e.target.value)}
                    maxLength={100}
                    autoComplete="address-line2"
                    placeholder="Apto., bloco ou ponto de referência"
                  />
                </label>
              </>
            ) : (
              <p className="pickup-info span-2">
                <MapPin size={18} />
                {boot.store.pickupAddress}
              </p>
            )}
          </div>
          <label className="field order-note">
            Um recado para a gente? <span>opcional</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Ex.: chamar quando chegar"
            />
          </label>
          <h3>
            <span>3</span> Pagamento com Pix
          </h3>
          <div className="pix-option">
            <span className="pix-mark">❖</span>
            <div>
              <strong>Pix, simples e rápido</strong>
              <p>QR Code e código copia e cola gerados para o pedido.</p>
            </div>
            <CheckCircle2 size={20} />
          </div>
          {boot.paymentMode === "mercadopago" && (
            <label className="field">
              CPF do pagador
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                inputMode="numeric"
                required
                minLength={11}
                maxLength={14}
                placeholder="000.000.000-00"
              />
              <small>
                Usado somente na geração da cobrança. Não fica salvo no pedido.
              </small>
            </label>
          )}
          {boot.demo && (
            <p className="demo-note">
              <Sparkles size={15} /> Demonstração: nenhum valor será cobrado.
              Use dados fictícios.
            </p>
          )}
        </div>
        <aside className="checkout-summary">
          <h3>Seu pedido, com carinho.</h3>
          {lines.map((i) => (
            <div className="checkout-item" key={i.id}>
              <span>
                {i.quantity}× {i.product.name}
              </span>
              <strong>{money(i.quantity * i.product.price)}</strong>
            </div>
          ))}
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>{delivery === "pickup" ? "Retirada" : "Entrega"}</span>
            <strong>
              {delivery === "delivery" && !customer.region
                ? "Selecione o bairro"
                : fee
                  ? money(fee)
                  : "Grátis"}
            </strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(subtotal + fee)}</strong>
          </div>
          <ErrorMessage text={error} />
          <button
            className="button button-gold full-width"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <>
                <Spinner /> Gerando seu Pix…
              </>
            ) : (
              <>
                Gerar Pix do pedido <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="secure-note">
            <ShieldCheck size={13} /> Você confere o código antes de pagar.
          </p>
          <p className="fine-print">
            Ao pedir, seus dados serão usados para preparar e entregar o pedido.{" "}
            <a href="/privacidade" target="_blank">
              Saiba como cuidamos dos seus dados.
            </a>
          </p>
        </aside>
      </form>
    </Modal>
  );
}

function Payment({
  order,
  onUpdate,
  onClose,
}: {
  order: Order;
  onUpdate: (o: Order) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const paid = ["approved", "demo_approved"].includes(order.paymentStatus);
  const expired = Boolean(order.expiresAt && order.expiresAt < now && !paid);
  const minutes = order.expiresAt
    ? Math.max(0, Math.ceil((order.expiresAt - now) / 60000))
    : null;
  async function check(simulate = false) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ order: Order }>(
        `/orders/${order.id}${simulate ? "/simulate" : order.paymentMode === "mercadopago" && !paid ? "/payment" : ""}`,
        simulate || (order.paymentMode === "mercadopago" && !paid)
          ? "POST"
          : "GET",
        simulate || (order.paymentMode === "mercadopago" && !paid)
          ? {}
          : undefined,
      );
      onUpdate(result.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (order.status === "delivered") return;
    const timer = setInterval(() => {
      void check();
    }, 12000);
    return () => clearInterval(timer);
  }, [order.id, order.status, order.paymentStatus]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(order.pixCode || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError("Selecione e copie o código no campo abaixo.");
    }
  }
  return (
    <Modal
      title={`Pedido ${order.number}`}
      onClose={onClose}
      kind="payment-modal"
    >
      <div className={`payment-header ${paid ? "paid" : ""}`}>
        <span className="payment-icon">
          {paid ? (
            <CheckCircle2 size={35} />
          ) : (
            <span className="pix-mark">❖</span>
          )}
        </span>
        <span className="eyebrow warm-eyebrow">PEDIDO #{order.number}</span>
        <h2>
          {paid
            ? "Agora é com a gente!"
            : expired
              ? "O prazo desse código terminou."
              : "Seu Perfect está quase lá."}
        </h2>
        <p>
          {paid
            ? "Recebemos a confirmação. Acompanhe seu pedido por aqui."
            : order.demo
              ? "Este é um Pix demonstrativo. Não faça um pagamento real."
              : "Abra o app do seu banco e pague usando o QR Code ou o código abaixo."}
        </p>
        <strong className="payment-total">{money(order.total)}</strong>
      </div>
      {!paid && (
        <>
          {order.qrCode && (
            <img
              className="qr-code"
              src={order.qrCode}
              alt={
                order.demo
                  ? "QR Code demonstrativo, sem cobrança bancária"
                  : "QR Code para pagamento Pix deste pedido"
              }
              width="240"
              height="240"
            />
          )}
          {order.demo && (
            <span className="demo-chip">DEMONSTRAÇÃO · SEM COBRANÇA</span>
          )}
          {minutes !== null && !expired && (
            <p className="payment-expiry">
              <Clock3 size={14} />
              {order.demo ? "Prévia disponível" : "Código válido"} por {minutes}{" "}
              min
            </p>
          )}
          <label className="field pix-code-label">
            {order.demo ? "Código demonstrativo" : "Pix copia e cola"}
            <textarea
              value={order.pixCode || ""}
              readOnly
              rows={2}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            className="button button-dark full-width"
            onClick={copy}
            disabled={expired || !order.pixCode}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied
              ? "Código copiado!"
              : order.demo
                ? "Copiar código demonstrativo"
                : "Copiar código Pix"}
          </button>
          {order.paymentMode === "manual" && (
            <p className="manual-note">
              A loja precisa conferir o recebimento no banco antes de confirmar
              este pedido. O QR estático não possui vencimento bancário.
            </p>
          )}
          {order.demo && (
            <button
              className="button button-gold full-width simulate-button"
              disabled={busy || expired}
              onClick={() => check(true)}
            >
              {busy ? <Spinner /> : <Sparkles size={17} />} Simular pagamento
              aprovado
            </button>
          )}
        </>
      )}
      {paid && <OrderProgress order={order} />}
      <div className="payment-order-info">
        <span>
          {order.deliveryType === "pickup"
            ? "Retirada na loja"
            : `Entrega em ${order.customer.region}`}
        </span>
        <span className={`status status-${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      <ErrorMessage text={error} />
      <button
        className="text-button payment-refresh"
        disabled={busy}
        onClick={() => check()}
      >
        {busy ? <Spinner /> : <Clock3 size={15} />} Atualizar status
      </button>
      <a className="payment-account-link" href="/conta">
        Ver meus pedidos <ArrowRight size={15} />
      </a>
      <div className="order-receipt">
        {order.items.map((i) => (
          <div key={i.id}>
            <span>
              {i.quantity}× {i.name}
            </span>
            <strong>{money(i.price * i.quantity)}</strong>
          </div>
        ))}
        <div>
          <span>Entrega</span>
          <strong>{money(order.deliveryFee)}</strong>
        </div>
      </div>
    </Modal>
  );
}
