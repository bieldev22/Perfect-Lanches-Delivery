import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Video,
} from "lucide-react";
import type {
  Analytics,
  Bootstrap,
  Dashboard,
  Order,
  Product,
  Store as StoreType,
  User,
} from "./types";
import { api, dateTime, money, statusLabels, uploadMedia } from "./api";
import { Brand, Empty, ErrorMessage, Modal, Spinner } from "./ui";
import { LoginForm } from "./Account";

const tabs = [
  { id: "overview", name: "Visão geral", icon: LayoutDashboard },
  { id: "orders", name: "Pedidos", icon: ShoppingBag },
  { id: "products", name: "Cardápio", icon: UtensilsCrossed },
  { id: "customers", name: "Clientes", icon: Users },
  { id: "insights", name: "Inteligência da loja", icon: Sparkles },
  { id: "settings", name: "Configurações", icon: Settings },
];
const nextStatus = {
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
} as const;
const nextLabel = {
  confirmed: "Iniciar preparo",
  preparing: "Enviar para entrega",
  out_for_delivery: "Marcar como entregue",
};
const categoryName = {
  burgers: "Hambúrgueres",
  fries: "Batatas",
  drinks: "Bebidas",
  sweets: "Doces",
};

export default function Admin({
  boot,
  ready,
  onUser,
}: {
  boot: Bootstrap;
  ready: boolean;
  onUser: (u: User | null) => void;
}) {
  const [tab, setTab] = useState("overview"),
    [days, setDays] = useState(30),
    [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | null>(null),
    [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [query, setQuery] = useState(""),
    [orderFilter, setOrderFilter] = useState("all");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const isAdmin = boot.user?.role === "admin";
  async function load() {
    try {
      setData(await api<Dashboard>(`/admin/dashboard?days=${days}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!isAdmin || !ready) return;
    void load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [isAdmin, ready, days]);
  useEffect(() => {
    setQuery("");
    setOrderFilter("all");
    setError("");
    setNotice("");
  }, [tab]);
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      onUser(null);
      setData(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function toggleOpen() {
    if (!data) return;
    try {
      await api("/admin/settings", "PATCH", { isOpen: !data.store.isOpen });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function advance(order: Order, manual = false) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ order: Order }>(
        `/admin/orders/${order.id}`,
        "PATCH",
        manual
          ? { confirmManual: true }
          : { status: nextStatus[order.status as keyof typeof nextStatus] },
      );
      setSelectedOrder(result.order);
      await load();
      setNotice("Pedido atualizado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function newProduct() {
    setEditing({
      id: `produto-${crypto.randomUUID().slice(0, 8)}`,
      name: "",
      category: "burgers",
      description: "",
      ingredients: [],
      price: 2490,
      image: "/media/classic.webp",
      video: "",
      badge: "",
      featured: false,
      active: true,
      allergens: "",
    });
  }
  if (!ready)
    return (
      <div className="page-loading">
        <Spinner /> Abrindo a administração…
      </div>
    );
  if (!isAdmin)
    return (
      <div className="admin-login-page">
        <a href="/" className="admin-back">
          ← Voltar ao delivery
        </a>
        <Brand />
        <LoginForm admin demo={boot.demo} onUser={onUser} />
        <p className="admin-login-foot">
          Perfect Lanches · Cuidado também nos bastidores.
        </p>
      </div>
    );
  const filteredOrders =
    data?.orders.filter(
      (o) =>
        (orderFilter === "all" || o.status === orderFilter) &&
        `${o.number} ${o.customer.name} ${o.customer.region}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  const visibleProducts =
    data?.products.filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand compact />
        <span className="admin-space-label">ESPAÇO DA GESTÃO</span>
        <nav aria-label="Administração">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "selected" : ""}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={18} />
              <span>{t.name}</span>
              {t.id === "insights" && <small>✦</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span>
            Feito para crescer
            <br />
            com você.
          </span>
          <Sparkles size={24} />
        </div>
        <a className="view-store" href="/" target="_blank" rel="noreferrer">
          <ArrowUpRight size={17} /> Ver minha loja
        </a>
        <button className="admin-user" onClick={logout}>
          <span className="admin-avatar">P</span>
          <span>
            <strong>{boot.user?.name}</strong>
            <small>Sair da conta</small>
          </span>
          <LogOut size={17} />
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span>PERFECT LANCHES</span>
            <strong>{tabs.find((t) => t.id === tab)?.name}</strong>
          </div>
          <div>
            {data && (
              <button
                onClick={toggleOpen}
                className={`store-toggle ${data.store.isOpen ? "open" : ""}`}
              >
                <span className="status-dot" />
                {data.store.isOpen ? "Loja aberta" : "Loja fechada"}
                <ChevronRight size={13} />
              </button>
            )}
            <a href="/" className="icon-btn" aria-label="Ver delivery">
              <Store size={19} />
            </a>
            <button
              className="icon-btn admin-mobile-logout"
              aria-label="Sair da administração"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="admin-content">
          {boot.demo && (
            <div className="admin-demo-bar">
              <Sparkles size={15} />
              <span>
                Ambiente de demonstração · pedidos e clientes fictícios. Os
                pedidos feitos no site também aparecem aqui.
              </span>
            </div>
          )}
          <div className="admin-page-title">
            <div>
              <span className="eyebrow warm-eyebrow">
                {tab === "overview"
                  ? "O SABOR DOS SEUS RESULTADOS"
                  : "CUIDADO EM CADA DETALHE"}
              </span>
              <h1>
                {tab === "overview"
                  ? "Um olhar para o seu negócio."
                  : tabs.find((t) => t.id === tab)?.name}
              </h1>
              <p>
                {tab === "overview"
                  ? "Veja o que acontece na sua loja e planeje o próximo passo."
                  : tab === "orders"
                    ? "Cada pedido merece sua atenção. Acompanhe e atualize o preparo."
                    : tab === "products"
                      ? "Fotos, ingredientes e preços: o seu cardápio do seu jeito."
                      : tab === "customers"
                        ? "Conheça quem escolhe a Perfect e os lugares onde seu sabor chega."
                        : tab === "insights"
                          ? "Transforme os pedidos em boas decisões para a sua loja."
                          : "Deixe as informações da loja sempre em dia."}
              </p>
            </div>
            {["overview", "insights"].includes(tab) ? (
              <label className="date-filter">
                <Clock3 size={16} />
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  aria-label="Período das análises"
                >
                  <option value={7}>Últimos 7 dias</option>
                  <option value={30}>Últimos 30 dias</option>
                  <option value={90}>Últimos 90 dias</option>
                </select>
              </label>
            ) : tab === "products" ? (
              <button className="button button-dark" onClick={newProduct}>
                <Plus size={17} /> Novo produto
              </button>
            ) : null}
          </div>
          <ErrorMessage text={error} />
          {notice && (
            <p className="success-message" role="status">
              {notice}
            </p>
          )}
          {!data ? (
            <div className="page-loading">
              {error ? (
                <button className="button button-dark" onClick={load}>
                  Tentar novamente
                </button>
              ) : (
                <>
                  <Spinner /> Buscando seus dados…
                </>
              )}
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className="stats-grid">
                    {[
                      {
                        title: "Receita confirmada",
                        value: money(data.analytics.revenue),
                        icon: CircleDollarSign,
                        caption: "Pedidos pagos, com entrega",
                      },
                      {
                        title: "Pedidos pagos",
                        value: data.analytics.orders.toString(),
                        icon: ShoppingBag,
                        caption: `Nos últimos ${days} dias`,
                      },
                      {
                        title: "Ticket médio",
                        value: money(data.analytics.averageTicket),
                        icon: TrendingUp,
                        caption: "Valor médio por pedido",
                      },
                      {
                        title: "Clientes no período",
                        value: data.analytics.customers.toString(),
                        icon: Users,
                        caption: "Identificados por conta ou e-mail",
                      },
                    ].map((s) => (
                      <article className="stat-card" key={s.title}>
                        <div>
                          <span>{s.title}</span>
                          <s.icon size={18} />
                        </div>
                        <strong>{s.value}</strong>
                        <small>{s.caption}</small>
                      </article>
                    ))}
                  </div>
                  <div className="dashboard-charts">
                    <article className="panel revenue-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Seu movimento, dia a dia</h2>
                          <p>Receita de pedidos com pagamento confirmado</p>
                        </div>
                        <span className="chart-key">
                          <i /> Receita
                        </span>
                      </div>
                      <RevenueChart analytics={data.analytics} />
                    </article>
                    <article className="panel weekday-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Quando dá mais fome?</h2>
                          <p>Pedidos por dia da semana</p>
                        </div>
                        <BarChart3 size={18} />
                      </div>
                      <WeekdayChart analytics={data.analytics} />
                    </article>
                  </div>
                  <div className="dashboard-bottom">
                    <article className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Os favoritos do cardápio</h2>
                          <p>Produtos mais pedidos no período</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab("products")}
                        >
                          Ver cardápio <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="ranking-list">
                        {data.analytics.products.slice(0, 5).map((p, i) => (
                          <div key={p.id}>
                            <span className="rank-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <img
                              src={
                                data.products.find(
                                  (product) => product.id === p.id,
                                )?.image || "/media/classic.webp"
                              }
                              alt=""
                              width="42"
                              height="42"
                            />
                            <div>
                              <strong>{p.name}</strong>
                              <span>{p.quantity} unidades</span>
                            </div>
                            <strong>{money(p.total)}</strong>
                          </div>
                        ))}
                        {!data.analytics.products.length && (
                          <p className="chart-empty">
                            As primeiras vendas vão aparecer aqui.
                          </p>
                        )}
                      </div>
                    </article>
                    <article className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Onde o sabor chega</h2>
                          <p>Bairros com mais pedidos</p>
                        </div>
                        <MapPin size={19} />
                      </div>
                      <RegionChart analytics={data.analytics} />
                    </article>
                  </div>
                  <div className="ai-callout">
                    <span className="ai-callout-icon">
                      <Sparkles size={24} />
                    </span>
                    <div>
                      <strong>
                        Seus números têm boas histórias para contar.
                      </strong>
                      <p>
                        Explore produtos, horários e bairros com a inteligência
                        da loja.
                      </p>
                    </div>
                    <button
                      className="button button-dark"
                      onClick={() => setTab("insights")}
                    >
                      Explorar análises <ArrowUpRight size={17} />
                    </button>
                  </div>
                </>
              )}
              {tab === "orders" && (
                <>
                  <div className="admin-list-toolbar">
                    <div className="order-filter-tabs">
                      {[
                        { id: "all", label: "Todos" },
                        { id: "awaiting_payment", label: "Aguardando Pix" },
                        { id: "confirmed", label: "Confirmados" },
                        { id: "preparing", label: "Em preparo" },
                        { id: "out_for_delivery", label: "Em entrega" },
                      ].map((f) => (
                        <button
                          className={orderFilter === f.id ? "selected" : ""}
                          onClick={() => setOrderFilter(f.id)}
                          key={f.id}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <SearchField
                      value={query}
                      onChange={setQuery}
                      placeholder="Buscar pedido ou cliente"
                    />
                  </div>
                  <div className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Pedido</th>
                          <th>Cliente</th>
                          <th>Bairro</th>
                          <th>Data</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <strong>#{o.number}</strong>
                              {o.demo && (
                                <small className="table-demo">Demo</small>
                              )}
                            </td>
                            <td>{o.customer.name}</td>
                            <td>
                              {o.deliveryType === "pickup"
                                ? "Retirada"
                                : o.customer.region}
                            </td>
                            <td>{dateTime(o.createdAt)}</td>
                            <td>
                              <strong>{money(o.total)}</strong>
                            </td>
                            <td>
                              <span className={`status status-${o.status}`}>
                                {statusLabels[o.status]}
                              </span>
                            </td>
                            <td>
                              <button
                                className="icon-btn"
                                onClick={() => {
                                  setSelectedOrder(o);
                                  setError("");
                                }}
                                aria-label={`Detalhes do pedido ${o.number}`}
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filteredOrders.length && (
                      <Empty
                        title="Nenhum pedido por aqui"
                        description="Novos pedidos e resultados da busca aparecerão nesta lista."
                      />
                    )}
                  </div>
                  <p className="fine-print admin-limit-note">
                    Últimos 300 pedidos. Atualização automática a cada 30
                    segundos.
                  </p>
                </>
              )}
              {tab === "products" && (
                <>
                  <div className="admin-list-toolbar">
                    <span>
                      {data.products.length} produtos ·{" "}
                      {data.products.filter((p) => p.active).length} disponíveis
                    </span>
                    <SearchField
                      value={query}
                      onChange={setQuery}
                      placeholder="Buscar no cardápio"
                    />
                  </div>
                  <div className="admin-product-grid">
                    {visibleProducts.map((p) => (
                      <article
                        className={`admin-product-card ${!p.active ? "inactive" : ""}`}
                        key={p.id}
                      >
                        <div>
                          <img
                            src={p.image}
                            alt={p.name}
                            width="400"
                            height="240"
                          />
                          <span
                            className={`availability ${p.active ? "available" : ""}`}
                          >
                            {p.active ? "Disponível" : "Pausado"}
                          </span>
                        </div>
                        <div className="admin-product-info">
                          <small>{categoryName[p.category]}</small>
                          <h3>{p.name}</h3>
                          <p>{p.description}</p>
                          <div>
                            <strong>{money(p.price)}</strong>
                            <button
                              className="button button-outline"
                              onClick={() => setEditing(p)}
                            >
                              <Pencil size={15} /> Editar
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!visibleProducts.length && (
                    <Empty
                      title="Nenhum produto encontrado"
                      description="Tente outra busca ou adicione uma novidade ao cardápio."
                    />
                  )}
                </>
              )}
              {tab === "customers" && (
                <>
                  <div className="admin-list-toolbar">
                    <span>
                      {data.customers.length} clientes no histórico disponível
                    </span>
                    <SearchField
                      value={query}
                      onChange={setQuery}
                      placeholder="Buscar cliente ou bairro"
                    />
                  </div>
                  <div className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Contato</th>
                          <th>Bairro</th>
                          <th>Pedidos pagos</th>
                          <th>Total em pedidos</th>
                          <th>Último pedido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.customers
                          .filter((c) =>
                            `${c.name} ${c.email} ${c.region}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((c) => (
                            <tr key={c.email}>
                              <td>
                                <span className="customer-name">
                                  <span className="customer-avatar">
                                    {c.name.charAt(0)}
                                  </span>
                                  <strong>{c.name}</strong>
                                </span>
                              </td>
                              <td>
                                {c.email}
                                <small className="table-subline">
                                  {c.phone}
                                </small>
                              </td>
                              <td>{c.region || "Retirada"}</td>
                              <td>{c.orders}</td>
                              <td>
                                <strong>{money(c.spent)}</strong>
                              </td>
                              <td>{dateTime(c.lastOrder)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="fine-print admin-limit-note">
                    Contatos visíveis somente à administração. As análises por
                    IA usam dados agregados.
                  </p>
                </>
              )}
              {tab === "insights" && <Insights data={data} days={days} />}
              {tab === "settings" && (
                <StoreSettings
                  store={data.store}
                  onSave={async () => {
                    await load();
                    setNotice("Informações da loja atualizadas.");
                  }}
                />
              )}
            </>
          )}
        </div>
        <footer className="admin-footer">
          <span>Perfect Lanches · Cuidado que vira resultado.</span>
          <span>
            <ShieldCheck size={13} /> Acesso administrativo
          </span>
        </footer>
      </div>
      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            setNotice("Produto salvo e cardápio atualizado.");
          }}
        />
      )}
      {selectedOrder && (
        <Modal
          title={`Pedido ${selectedOrder.number}`}
          onClose={() => setSelectedOrder(null)}
          kind="admin-order-modal"
        >
          <span className="eyebrow warm-eyebrow">CADA PEDIDO IMPORTA</span>
          <h2>Pedido #{selectedOrder.number}</h2>
          <div className="admin-order-meta">
            <span>{dateTime(selectedOrder.createdAt)}</span>
            <span className={`status status-${selectedOrder.status}`}>
              {statusLabels[selectedOrder.status]}
            </span>
          </div>
          <h3>{selectedOrder.customer.name}</h3>
          <p>
            {selectedOrder.customer.email} · {selectedOrder.customer.phone}
          </p>
          <p className="admin-order-address">
            <MapPin size={17} />
            {selectedOrder.deliveryType === "pickup"
              ? "Retirada na loja"
              : `${selectedOrder.customer.street}, ${selectedOrder.customer.number} ${selectedOrder.customer.complement} · ${selectedOrder.customer.region}`}
          </p>
          <div className="admin-order-lines">
            {selectedOrder.items.map((i) => (
              <div key={i.id}>
                <img src={i.image} alt="" width="56" height="56" />
                <div>
                  <strong>
                    {i.quantity}× {i.name}
                  </strong>
                  {i.note && <p>{i.note}</p>}
                </div>
                <strong>{money(i.quantity * i.price)}</strong>
              </div>
            ))}
          </div>
          {selectedOrder.note && (
            <p className="order-customer-note">
              <strong>Observação:</strong> {selectedOrder.note}
            </p>
          )}
          <div className="summary-line">
            <span>Entrega</span>
            <strong>{money(selectedOrder.deliveryFee)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(selectedOrder.total)}</strong>
          </div>
          <p className="fine-print">
            {selectedOrder.paymentMode === "demo"
              ? "Pagamento demonstrativo. Nenhuma cobrança bancária."
              : selectedOrder.paymentMode === "manual"
                ? "Pix por chave: exige conferência do recebimento no banco."
                : "Cobrança via Mercado Pago. Confirmação consultada no provedor."}
          </p>
          <ErrorMessage text={error} />
          {selectedOrder.status in nextStatus && (
            <button
              className="button button-gold full-width"
              disabled={busy}
              onClick={() => advance(selectedOrder)}
            >
              {busy ? (
                <Spinner />
              ) : (
                <>
                  {nextLabel[selectedOrder.status as keyof typeof nextLabel]}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          )}
          {selectedOrder.status === "awaiting_payment" &&
            selectedOrder.paymentMode === "manual" && (
              <button
                className="button button-dark full-width"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Você conferiu o crédito deste valor na conta bancária da loja? A confirmação libera o preparo do pedido.",
                    )
                  )
                    void advance(selectedOrder, true);
                }}
              >
                Conferi o crédito no banco: confirmar Pix
              </button>
            )}
        </Modal>
      )}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-box admin-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function RevenueChart({ analytics }: { analytics: Analytics }) {
  const values = analytics.daily,
    max = Math.max(...values.map((d) => d.total), 100);
  const width = 720,
    height = 195,
    pad = 50;
  const points = values
    .map(
      (d, i) =>
        `${pad + (i / Math.max(values.length - 1, 1)) * (width - pad - 12)},${height - 22 - (d.total / max) * (height - 45)}`,
    )
    .join(" ");
  return (
    <div className="revenue-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Receita diária, total de ${money(analytics.revenue)} em ${analytics.days} dias`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#bd8b38" stopOpacity=".27" />
            <stop offset="100%" stopColor="#bd8b38" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={pad}
              x2={width - 10}
              y1={height - 22 - v * (height - 45)}
              y2={height - 22 - v * (height - 45)}
              stroke="#ece8e0"
              strokeDasharray="4 4"
            />
            <text
              x="0"
              y={height - 18 - v * (height - 45)}
              fill="#9b9486"
              fontSize="10"
            >
              {money(Math.round(max * v))}
            </text>
          </g>
        ))}
        <polygon
          points={`${pad},${height - 22} ${points} ${width - 12},${height - 22}`}
          fill="url(#chart-fill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#b58a42"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((d, i) => (
          <circle
            key={d.date}
            cx={pad + (i / Math.max(values.length - 1, 1)) * (width - pad - 12)}
            cy={height - 22 - (d.total / max) * (height - 45)}
            r="5"
            fill="transparent"
          >
            <title>
              {d.date}: {money(d.total)} · {d.count} pedidos
            </title>
          </circle>
        ))}
      </svg>
      <div className="chart-dates">
        {values
          .filter((_, i) => i % Math.max(1, Math.ceil(values.length / 6)) === 0)
          .map((d) => (
            <span key={d.date}>
              {d.date.slice(5).split("-").reverse().join("/")}
            </span>
          ))}
      </div>
    </div>
  );
}
function WeekdayChart({ analytics }: { analytics: Analytics }) {
  const max = Math.max(...analytics.weekdays.map((d) => d.count), 1),
    best = analytics.weekdays.find((d) => d.count === max);
  return (
    <>
      <div
        className="weekday-chart"
        role="img"
        aria-label={analytics.weekdays
          .map((d) => `${d.name}: ${d.count} pedidos`)
          .join("; ")}
      >
        {analytics.weekdays.map((d) => (
          <div key={d.name}>
            <span>{d.count}</span>
            <div className="weekday-bar-track">
              <i
                className={d.count === max ? "highest" : ""}
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.name}: ${d.count} pedidos`}
              />
            </div>
            <span>{d.name}</span>
          </div>
        ))}
      </div>
      <p className="chart-insight">
        <TrendingUp size={14} />
        {best
          ? `${best.name} concentra ${best.count} pedidos no período.`
          : "Aguardando os primeiros pedidos."}
      </p>
    </>
  );
}
function RegionChart({ analytics }: { analytics: Analytics }) {
  const max = Math.max(...analytics.regions.map((r) => r.count), 1);
  return (
    <div className="region-chart">
      {analytics.regions.slice(0, 6).map((r, i) => (
        <div key={r.name}>
          <div>
            <span>{r.name}</span>
            <strong>
              {r.count}
              <small> pedidos</small>
            </strong>
          </div>
          <span className="region-track">
            <i
              style={{
                width: `${(r.count / max) * 100}%`,
                opacity: 1 - i * 0.1,
              }}
            />
          </span>
        </div>
      ))}
      {!analytics.regions.length && (
        <p className="chart-empty">
          As regiões aparecem após as primeiras vendas.
        </p>
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(product),
    [ingredients, setIngredients] = useState(product.ingredients.join("\n")),
    [price, setPrice] = useState((product.price / 100).toFixed(2));
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(""),
    [error, setError] = useState("");
  function field<K extends keyof Product>(key: K, value: Product[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  async function upload(file: File | undefined, kind: "image" | "video") {
    if (!file) return;
    setUploading(kind);
    setError("");
    try {
      field(kind, await uploadMedia(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading("");
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/admin/products/${product.id}`, "PUT", {
        ...draft,
        price: Math.round(Number(price.replace(",", ".")) * 100),
        ingredients: ingredients
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Editar produto" onClose={onClose} kind="product-editor">
      <span className="eyebrow warm-eyebrow">O CARDÁPIO DO SEU JEITO</span>
      <h2>
        {product.name
          ? "Um capricho nos detalhes."
          : "Uma novidade no cardápio."}
      </h2>
      <form onSubmit={save}>
        <div className="editor-media">
          <img
            src={draft.image}
            alt="Prévia do produto"
            width="500"
            height="240"
          />
          <div>
            <label className="button button-outline upload-button">
              {uploading === "image" ? <Spinner /> : <ImagePlus size={17} />}{" "}
              Alterar foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e.target.files?.[0], "image")}
                disabled={Boolean(uploading)}
              />
            </label>
            <small>JPG, PNG ou WebP · até 8 MB</small>
            <label className="button button-outline upload-button">
              {uploading === "video" ? <Spinner /> : <Video size={17} />}{" "}
              {draft.video ? "Trocar minivídeo" : "Adicionar minivídeo"}
              <input
                type="file"
                accept="video/mp4"
                onChange={(e) => upload(e.target.files?.[0], "video")}
                disabled={Boolean(uploading)}
              />
            </label>
            <small>MP4 · até 15 MB · sem áudio no cardápio</small>
            {draft.video && (
              <button
                type="button"
                className="text-button"
                onClick={() => field("video", "")}
              >
                Remover vídeo
              </button>
            )}
          </div>
        </div>
        <div className="form-grid">
          <label className="field span-2">
            Nome
            <input
              value={draft.name}
              onChange={(e) => field("name", e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            Categoria
            <select
              aria-label="Categoria do produto"
              value={draft.category}
              onChange={(e) =>
                field("category", e.target.value as Product["category"])
              }
            >
              {Object.entries(categoryName).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Preço (R$)
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="1"
              max="1000"
              step="0.01"
              required
            />
          </label>
          <label className="field span-2">
            Descrição
            <textarea
              aria-label="Descrição"
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
              rows={3}
              required
              maxLength={700}
            />
          </label>
          <label className="field span-2">
            Ingredientes <span>um por linha</span>
            <textarea
              aria-label="Ingredientes"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={4}
              required
            />
          </label>
          <label className="field">
            Selo de destaque
            <input
              value={draft.badge}
              onChange={(e) => field("badge", e.target.value)}
              maxLength={50}
              placeholder="Ex.: Especial da casa"
            />
          </label>
          <label className="field">
            Alergênicos
            <input
              value={draft.allergens}
              onChange={(e) => field("allergens", e.target.value)}
              maxLength={300}
            />
          </label>
        </div>
        <div className="editor-checks">
          <label>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => field("active", e.target.checked)}
            />{" "}
            Disponível no cardápio
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => field("featured", e.target.checked)}
            />{" "}
            Produto em destaque
          </label>
        </div>
        <ErrorMessage text={error} />
        <div className="editor-actions">
          <button
            className="button button-outline"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button button-gold"
            disabled={busy || Boolean(uploading)}
            type="submit"
          >
            {busy ? <Spinner /> : <Check size={17} />} Salvar produto
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Insights({ data, days }: { data: Dashboard; days: number }) {
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setAnswer("");
    setError("");
    setSource("");
  }, [days]);
  async function analyze(q = question) {
    setBusy(true);
    setError("");
    setQuestion(q);
    try {
      const response = await api<{ text: string; source: string }>(
        "/admin/insights",
        "POST",
        { question: q, days },
      );
      setAnswer(response.text);
      setSource(response.source);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="insights-layout">
      <section className="panel ai-panel">
        <div className="ai-panel-heading">
          <span className="ai-symbol">
            <Sparkles size={28} />
          </span>
          <div>
            <h2>Uma boa pergunta muda tudo.</h2>
            <p>Produtos, dias e regiões: encontre os próximos passos.</p>
          </div>
        </div>
        <div className="ai-mode">
          <span className={`status-dot ${data.aiEnabled ? "" : "local"}`} />
          {data.aiEnabled
            ? "IA conectada"
            : "Análise estatística local · IA não conectada"}
        </div>
        <div className="ai-suggestions">
          {[
            "Quais produtos mais vendem?",
            "Quais são os dias de pico?",
            "Quais regiões mais pedem?",
          ].map((q) => (
            <button key={q} disabled={busy} onClick={() => analyze(q)}>
              {q}
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void analyze();
          }}
          className="ai-question"
        >
          <label className="field">
            O que você quer entender?
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: como posso planejar melhor o preparo no fim de semana?"
            />
          </label>
          <button className="button button-dark" disabled={busy} type="submit">
            {busy ? (
              <>
                <Spinner /> Analisando os dados…
              </>
            ) : (
              <>
                <Sparkles size={17} /> Analisar meu delivery
              </>
            )}
          </button>
        </form>
        <ErrorMessage text={error} />
        {answer ? (
          <div className="ai-answer">
            <span>
              <Sparkles size={15} />
              {source === "openai"
                ? "Análise gerada por IA"
                : "Análise calculada localmente"}{" "}
              · últimos {days} dias
            </span>
            <p>{answer}</p>
            <small>
              Sugestões para avaliar. O histórico não garante resultados
              futuros.
            </small>
          </div>
        ) : (
          <div className="ai-placeholder">
            <BarChart3 size={38} strokeWidth={1.2} />
            <p>
              Seu próximo insight começa
              <br />
              com uma pergunta.
            </p>
          </div>
        )}
        <div className="ai-privacy">
          <ShieldCheck size={15} />
          <p>
            A análise usa totais agregados, sem nomes, contatos ou endereços dos
            clientes.
            {!data.aiEnabled &&
              " Configure a chave de IA no servidor para habilitar a análise generativa."}
          </p>
        </div>
      </section>
      <aside>
        <article className="panel insight-quick">
          <span className="eyebrow warm-eyebrow">NO RADAR</span>
          <h3>Seu período em 3 olhares.</h3>
          <div>
            <UtensilsCrossed size={19} />
            <span>
              Produto favorito
              <strong>
                {data.analytics.products[0]?.name || "Aguardando vendas"}
              </strong>
            </span>
          </div>
          <div>
            <Clock3 size={19} />
            <span>
              Dia com mais pedidos
              <strong>
                {data.analytics.orders
                  ? [...data.analytics.weekdays].sort(
                      (a, b) => b.count - a.count,
                    )[0]?.name
                  : "Aguardando vendas"}
              </strong>
            </span>
          </div>
          <div>
            <MapPin size={19} />
            <span>
              Bairro em destaque
              <strong>
                {data.analytics.regions[0]?.name || "Aguardando vendas"}
              </strong>
            </span>
          </div>
        </article>
        <div className="insights-source">
          <ShieldCheck size={18} />
          <p>
            {data.demo
              ? "Estes dados são demonstrativos e servem para conhecer o painel."
              : "Somente pedidos pagos e não cancelados entram nos indicadores."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function StoreSettings({
  store,
  onSave,
}: {
  store: StoreType;
  onSave: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(store),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/settings", "PATCH", draft);
      await onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel settings-panel" onSubmit={save}>
      <div className="panel-heading">
        <div>
          <h2>O cuidado começa nas informações.</h2>
          <p>Estas informações aparecem no delivery.</p>
        </div>
        <Store size={22} />
      </div>
      <div className="form-grid">
        <label className="field span-2">
          Horário de atendimento
          <input
            value={draft.hours}
            onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
            required
            maxLength={100}
          />
        </label>
        <label className="field span-2">
          Endereço completo para retirada
          <input
            value={draft.pickupAddress}
            onChange={(e) =>
              setDraft((d) => ({ ...d, pickupAddress: e.target.value }))
            }
            required
            maxLength={200}
          />
        </label>
        <label className="field">
          Prazo estimado (minutos)
          <input
            value={draft.deliveryMinutes}
            onChange={(e) =>
              setDraft((d) => ({ ...d, deliveryMinutes: e.target.value }))
            }
            required
            maxLength={20}
          />
        </label>
        <label className="field">
          Pedido mínimo (R$)
          <input
            type="number"
            value={draft.minimumOrder / 100}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                minimumOrder: Math.round(Number(e.target.value) * 100),
              }))
            }
            min="0"
            max="1000"
            step="0.01"
            required
          />
        </label>
      </div>
      <h3 className="settings-regions-title">Bairros e taxas de entrega</h3>
      <div className="settings-regions">
        {draft.regions.map((r, i) => (
          <div key={i}>
            <label className="field">
              Bairro
              <input
                value={r.name}
                maxLength={80}
                required
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    regions: d.regions.map((v, j) =>
                      i === j ? { ...v, name: e.target.value } : v,
                    ),
                  }))
                }
              />
            </label>
            <label className="field">
              Taxa (R$)
              <input
                type="number"
                value={r.fee / 100}
                min="0"
                max="100"
                step="0.01"
                required
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    regions: d.regions.map((v, j) =>
                      i === j
                        ? {
                            ...v,
                            fee: Math.round(Number(e.target.value) * 100),
                          }
                        : v,
                    ),
                  }))
                }
              />
            </label>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remover bairro ${r.name}`}
              disabled={draft.regions.length === 1}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  regions: d.regions.filter((_, j) => j !== i),
                }))
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() =>
          setDraft((d) => ({
            ...d,
            regions: [...d.regions, { name: "", fee: 500 }],
          }))
        }
      >
        <Plus size={16} /> Adicionar bairro
      </button>
      <div className="editor-checks">
        <label>
          <input
            type="checkbox"
            checked={draft.isOpen}
            onChange={(e) =>
              setDraft((d) => ({ ...d, isOpen: e.target.checked }))
            }
          />{" "}
          Loja aberta para novos pedidos
        </label>
      </div>
      <p className="fine-print">
        A abertura da loja é controlada por este botão. Os horários publicados
        são informativos. Credenciais Pix e IA são configuradas somente no
        servidor.
      </p>
      <ErrorMessage text={error} />
      <button className="button button-gold" disabled={busy} type="submit">
        {busy ? <Spinner /> : <Check size={17} />} Salvar informações
      </button>
    </form>
  );
}
