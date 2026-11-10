import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChefHat,
  Heart,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api, money } from "./api";
import { Empty, ErrorMessage, OrderCard, Spinner } from "./ui";
import type { Bootstrap, Customer, Order, User } from "./types";

export function LoginForm({
  admin = false,
  demo,
  onUser,
}: {
  admin?: boolean;
  demo: boolean;
  onUser: (user: User) => void;
}) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api<{ user: User }>(
        register ? "/auth/register" : "/auth/login",
        "POST",
        values,
      );
      if (admin && data.user.role !== "admin") {
        setError(
          "Esta conta não tem acesso administrativo. Entre com uma conta da loja.",
        );
        return;
      }
      onUser(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function enterDemo() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: User }>("/auth/demo", "POST", {});
      onUser(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-card">
      <span className="login-icon">
        {admin ? <ChefHat size={28} /> : <UserRound size={27} />}
      </span>
      <span className="eyebrow warm-eyebrow">
        {admin ? "BASTIDORES DA PERFECT" : "SEU CANTINHO PERFECT"}
      </span>
      <h2>
        {admin
          ? "Tudo sob seu cuidado."
          : register
            ? "Prazer em ter você aqui."
            : "Bom te ver por aqui."}
      </h2>
      <p>
        {admin
          ? "Entre para cuidar dos pedidos, do cardápio e dos próximos passos da loja."
          : register
            ? "Crie sua conta para salvar seu endereço e acompanhar seus pedidos."
            : "Entre para acompanhar seus pedidos e pedir de novo seus favoritos."}
      </p>
      <form onSubmit={submit}>
        {register && (
          <label className="field">
            Seu nome
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Como podemos te chamar?"
            />
          </label>
        )}
        <label className="field">
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={150}
            placeholder="voce@email.com"
          />
        </label>
        <label className="field">
          Senha
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 8 : 1}
            maxLength={128}
            placeholder={register ? "Pelo menos 8 caracteres" : "Sua senha"}
          />
        </label>
        <ErrorMessage text={error} />
        <button
          type="submit"
          className="button button-gold full-width"
          disabled={busy}
        >
          {busy ? (
            <Spinner />
          ) : (
            <>
              {register ? "Criar minha conta" : "Entrar"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      {!admin && (
        <p className="login-switch">
          {register ? "Já tem conta?" : "Primeira vez por aqui?"}
          <button
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Entrar" : "Criar conta"}
          </button>
        </p>
      )}
      {admin && demo && (
        <div className="demo-entry">
          <span>Conheça o painel com dados fictícios.</span>
          <button disabled={busy} onClick={enterDemo}>
            Explorar demonstração local <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="secure-note">
        <ShieldCheck size={14} />{" "}
        {admin
          ? "Acesso restrito à equipe da loja."
          : "Você também pode pedir sem criar uma conta."}
      </div>
    </div>
  );
}

export function Account({
  boot,
  ready,
  onUser,
  onOrder,
  onReorder,
}: {
  boot: Bootstrap;
  ready: boolean;
  onUser: (user: User | null) => void;
  onOrder: (order: Order) => void;
  onReorder: (order: Order) => void;
}) {
  const [tab, setTab] = useState<"orders" | "profile">("orders"),
    [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const load = () =>
      api<{ orders: Order[] }>("/orders")
        .then((data) => {
          if (alive) {
            setOrders(data.orders);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (alive) {
            setError(e.message);
            setLoading(false);
          }
        });
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ready, boot.user?.id]);
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      onUser(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    try {
      const result = await api<{ user: User }>(
        "/profile",
        "PATCH",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      onUser(result.user);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!ready)
    return (
      <div className="page-loading">
        <Spinner /> Preparando sua conta…
      </div>
    );
  return (
    <div className="account-page container">
      <div className="account-title">
        <div>
          <span className="eyebrow warm-eyebrow">UMA RELAÇÃO DE BOM GOSTO</span>
          <h1>
            {boot.user
              ? `Olá, ${boot.user.name.split(" ")[0]}.`
              : "Seu cantinho Perfect."}
          </h1>
          <p>
            {boot.user
              ? "Seus sabores favoritos e seus pedidos, sempre por perto."
              : "Acompanhe seu pedido ou crie sua conta para a próxima visita."}
          </p>
        </div>
        {boot.user && (
          <button className="button button-outline" onClick={logout}>
            <LogOut size={16} /> Sair da conta
          </button>
        )}
      </div>
      <div className={`account-layout ${boot.user ? "" : "guest-account"}`}>
        {!boot.user ? (
          <LoginForm demo={boot.demo} onUser={onUser} />
        ) : (
          <aside className="account-sidebar">
            <span className="avatar">{boot.user.name.charAt(0)}</span>
            <strong>{boot.user.name}</strong>
            <p>{boot.user.email}</p>
            <button
              className={tab === "orders" ? "selected" : ""}
              onClick={() => setTab("orders")}
            >
              <Package size={18} /> Meus pedidos
            </button>
            <button
              className={tab === "profile" ? "selected" : ""}
              onClick={() => setTab("profile")}
            >
              <MapPin size={18} /> Meus dados e endereço
            </button>
            {boot.user.role === "admin" && (
              <a href="/admin">
                <ChefHat size={18} /> Painel administrativo
              </a>
            )}
          </aside>
        )}
        <section className="account-content">
          {tab === "orders" || !boot.user ? (
            <>
              <div className="account-section-title">
                <h2>Meus pedidos</h2>
                <span>{orders.length} pedidos</span>
              </div>
              <ErrorMessage text={error} />
              {loading ? (
                <div className="page-loading">
                  <Spinner />
                </div>
              ) : orders.length ? (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.id}>
                      <OrderCard
                        order={order}
                        onSelect={() => onOrder(order)}
                      />
                      {order.status === "delivered" && (
                        <button
                          className="reorder-button"
                          onClick={() => onReorder(order)}
                        >
                          <Heart size={14} /> Pedir de novo, com os preços
                          atuais <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Seu próximo favorito está esperando"
                  description="Quando você fizer um pedido, cada etapa vai aparecer aqui."
                >
                  <a href="/#cardapio" className="button button-gold">
                    Escolher meu lanche <ArrowRight size={17} />
                  </a>
                </Empty>
              )}
              {!boot.user && orders.length > 0 && (
                <p className="fine-print">
                  Seus pedidos de visitante ficam vinculados à sessão deste
                  navegador. Crie uma conta para mantê-los acessíveis depois.
                </p>
              )}
            </>
          ) : (
            <>
              <h2>Seus dados, seu jeito.</h2>
              <p className="profile-intro">
                Salve o endereço para facilitar o próximo pedido.
              </p>
              <form
                onSubmit={saveProfile}
                className="profile-form"
                key={boot.user.id}
              >
                <div className="form-grid">
                  <label className="field span-2">
                    Nome
                    <input
                      name="name"
                      defaultValue={boot.user.name}
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                  <label className="field">
                    E-mail
                    <input value={boot.user.email} readOnly type="email" />
                  </label>
                  <label className="field">
                    WhatsApp
                    <input
                      name="phone"
                      defaultValue={boot.user.profile.phone}
                      maxLength={20}
                      type="tel"
                      autoComplete="tel-national"
                    />
                  </label>
                  <label className="field span-2">
                    Bairro
                    <select
                      aria-label="Bairro"
                      name="region"
                      defaultValue={boot.user.profile.region || ""}
                    >
                      <option value="">Selecione seu bairro</option>
                      {boot.store.regions.map((r) => (
                        <option key={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                  {(
                    ["street", "number", "complement"] as (keyof Customer)[]
                  ).map((name, i) => (
                    <label
                      className={`field ${i === 2 ? "span-2" : ""}`}
                      key={name}
                    >
                      {["Rua ou avenida", "Número", "Complemento"][i]}
                      <input
                        name={name}
                        defaultValue={boot.user!.profile[name]}
                        maxLength={name === "number" ? 15 : 100}
                      />
                    </label>
                  ))}
                </div>
                <ErrorMessage text={error} />
                {saved && (
                  <p className="success-message" role="status">
                    Pronto! Seus dados foram atualizados.
                  </p>
                )}
                <button className="button button-gold" type="submit">
                  Salvar meus dados <ArrowRight size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
      <div className="account-note">
        <ShieldCheck size={17} />{" "}
        {boot.demo
          ? "Ambiente demonstrativo: use dados fictícios nos testes."
          : "Seu endereço aparece somente para você e para a equipe que cuida do pedido."}
      </div>
    </div>
  );
}
