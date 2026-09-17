"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, CheckCircle2, ChevronRight, Clock3, Download, FileText,
  History, Home, LogOut, Menu, MessageCircle, MonitorSmartphone, PackageCheck,
  Pencil, Plus, Printer, ReceiptText, Search, Settings, ShieldCheck,
  Smartphone, Sparkles, Trash2, WashingMachine, Wrench, X, Zap, Star,
  CalendarDays, MapPin, Send, Upload, Video, Eye, EyeOff, PlayCircle,
} from "lucide-react";

type Company = { brand: string; technician: string; document: string; phone: string; whatsapp: string; address: string; warranty: string; signatureSrc: string; signatureX: number; signatureY: number; signatureWidth: number };
type Receipt = { id: string; number: string; createdAt: string; customer: string; customerPhone: string; equipment: string; brandModel: string; serial: string; problem: string; service: string; parts: string; labor: string; total: string; payment: string; warranty: string; notes: string; status: "Concluído" | "Em andamento" };
type Review = { id: string; name: string; text: string; rating: number; photo: string; createdAt: string };
type PortfolioVideo = { id: string; title: string; sourceType: "url" | "file"; src: string; visible: boolean; createdAt: string };

const defaultCompany: Company = { brand: "Assistência Técnica Jorge Rodrigues", technician: "Jorge Rodrigues", document: "CPF/CNPJ: informe no painel", phone: "(21) 96927-8056", whatsapp: "5521969278056", address: "Rio de Janeiro - RJ", warranty: "90 dias", signatureSrc: "/assinatura-jorge-de-melo-rodrigues.png", signatureX: 50, signatureY: 82, signatureWidth: 28 };
const emptyReceipt: Receipt = { id: "", number: "", createdAt: new Date().toISOString().slice(0, 10), customer: "", customerPhone: "", equipment: "", brandModel: "", serial: "", problem: "", service: "", parts: "0,00", labor: "0,00", total: "0,00", payment: "Pix", warranty: "90 dias", notes: "", status: "Concluído" };
const services = [
  { icon: WashingMachine, title: "Eletrodomésticos", text: "Diagnóstico e reparo com cuidado em cada detalhe." },
  { icon: MonitorSmartphone, title: "Eletrônicos", text: "Manutenção ágil para os equipamentos do dia a dia." },
  { icon: Smartphone, title: "Atendimento no local", text: "Comodidade, transparência e hora marcada." },
];
const BRL = (value: string) => Number(value.replace(/\./g, "").replace(",", ".") || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const digits = (value: string) => value.replace(/\D/g, "");
const whatsappLink = (phone: string, message: string) => `https://wa.me/${digits(phone)}?text=${encodeURIComponent(message)}`;
const receiptWhatsappMessage = (company: Company, receipt: Receipt) => `Olá, ${receipt.customer || "cliente"}! Aqui é da ${company.brand}. Segue o recibo ${receipt.number || "do seu atendimento"} referente ao serviço em ${receipt.equipment || "seu equipamento"}. Total: ${BRL(receipt.total)}. Garantia: ${receipt.warranty || company.warranty}. Vou anexar o PDF do recibo nesta conversa. Qualquer dúvida, estou à disposição.`;

export default function HomePage() {
  const [area, setArea] = useState<"site" | "painel">("site");
  const [logged, setLogged] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"inicio" | "novo" | "historico" | "avaliacoes" | "portfolio" | "config">("inicio");
  const [company, setCompany] = useState<Company>(defaultCompany);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolioEnabled, setPortfolioEnabled] = useState(false);
  const [portfolioVideos, setPortfolioVideos] = useState<PortfolioVideo[]>([]);
  const [draft, setDraft] = useState<Receipt>(emptyReceipt);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const loadData = async () => {
    const response = await fetch("/api/data", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Falha ao carregar dados");
    setCompany({ ...defaultCompany, ...(data.company || {}) });
    setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
    setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    setPortfolioVideos(Array.isArray(data.portfolioVideos) ? data.portfolioVideos : []);
    setPortfolioEnabled(Boolean(data.portfolioEnabled));
    return data;
  };

  useEffect(() => {
    const adminPath = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
    Promise.all([
      fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ authenticated: false })),
      loadData().catch((error) => { setToast(`Não foi possível sincronizar os dados: ${error instanceof Error ? error.message : "falha desconhecida"}`); return {}; }),
    ]).then(([session]) => {
      const active = Boolean(session?.authenticated);
      setLogged(active);
      if (adminPath) {
        if (active) { setArea("painel"); void loadData(); }
        else setLoginOpen(true);
      }
    });
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer) }, [toast]);

  const filteredReceipts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return receipts;
    return receipts.filter((item) => [item.customer, item.number, item.equipment, item.customerPhone].join(" ").toLowerCase().includes(term));
  }, [receipts, search]);

  const showPanel = async () => { setLoginOpen(false); setLogged(true); setArea("painel"); await loadData().catch(() => undefined); };
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user: String(data.get("user") || ""), password: String(data.get("password") || "") }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Usuário ou senha incorretos.");
      await showPanel();
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível entrar."); }
  };
  const startReceipt = () => { setDraft({ ...emptyReceipt, warranty: company.warranty, createdAt: new Date().toISOString().slice(0, 10) }); setSelected(null); setPanelTab("novo") };
  const saveReceipt = async () => {
    if (!draft.customer || !draft.equipment || !draft.service) return setToast("Preencha cliente, equipamento e serviço realizado.");
    const editing = Boolean(draft.id);
    const finalReceipt: Receipt = editing ? draft : { ...draft, id: crypto.randomUUID(), number: `RT-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, "0")}` };
    const next = editing ? receipts.map((item) => item.id === finalReceipt.id ? finalReceipt : item) : [finalReceipt, ...receipts];
    setReceipts(next); setSelected(finalReceipt); setDraft(finalReceipt);
    try {
      const response = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "saveReceipt", receipt: finalReceipt }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao gravar no D1");
      setToast(editing ? "Recibo atualizado e sincronizado." : "Recibo criado e salvo na nuvem.");
    } catch (error) {
      setToast(`Não foi possível salvar no banco: ${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  };
  const editReceipt = (receipt: Receipt) => { setDraft(receipt); setSelected(receipt); setPanelTab("novo") };
  const duplicateReceipt = (receipt: Receipt) => { setDraft({ ...receipt, id: "", number: "", createdAt: new Date().toISOString().slice(0, 10) }); setSelected(null); setPanelTab("novo") };
  const deleteReceipt = async (id: string) => { if (!window.confirm("Excluir este recibo?")) return; try { const response = await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"deleteReceipt", id }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error || "Falha ao excluir"); setReceipts(receipts.filter((item) => item.id !== id)); setToast("Recibo excluído."); } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível excluir."); } };
  const saveCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"saveCompany", company }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar");
      setToast("Dados da empresa atualizados e salvos no banco.");
    } catch (error) {
      setToast(`Erro ao salvar no banco: ${error instanceof Error ? error.message : "falha desconhecida"}`);
    }
  };
  const addReview = async (review: Omit<Review, "id" | "createdAt">) => {
    const created: Review = { ...review, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    try {
      const response = await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"addReview", review:created }) });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setReviews((current) => [data.review as Review, ...current]);
      setToast("Avaliação enviada. Obrigado!");
    } catch { setToast("Não foi possível enviar a avaliação."); }
  };
  const deleteReview = async (id: string) => {
    const next = reviews.filter((review) => review.id !== id);
    setReviews(next); await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"deleteReview", id }) }); setToast("Avaliação removida.");
  };
  const savePortfolioVideo = async (video: PortfolioVideo) => {
    await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"savePortfolio", video }) });
  };
  const addPortfolioUrl = async (title: string, src: string) => {
    if (!src.trim()) return setToast("Informe o link do vídeo.");
    const created: PortfolioVideo = { id: crypto.randomUUID(), title: title.trim() || "Serviço realizado", sourceType: "url", src: src.trim(), visible: true, createdAt: new Date().toISOString() };
    setPortfolioVideos((current) => [created, ...current]); await savePortfolioVideo(created); setToast("Vídeo adicionado ao portfólio.");
  };
  const addPortfolioFile = async (title: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setToast("Selecione um arquivo de vídeo.");
    const id = crypto.randomUUID();
    try {
      const form = new FormData(); form.append("file", file); form.append("id", id); form.append("kind", "portfolio");
      const upload = await fetch("/api/media", { method:"POST", body:form });
      const uploaded = await upload.json();
      if (!upload.ok) throw new Error();
      const created: PortfolioVideo = { id, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), sourceType: "file", src: uploaded.src, visible: true, createdAt: new Date().toISOString() };
      setPortfolioVideos((current) => [created, ...current]); await savePortfolioVideo(created); setToast("Vídeo enviado para a nuvem e adicionado ao portfólio.");
    } catch { setToast("Não foi possível enviar este vídeo para o armazenamento."); }
  };
  const togglePortfolioVideo = async (id: string) => {
    const updated = portfolioVideos.find((video) => video.id === id);
    if (!updated) return;
    const nextVideo = { ...updated, visible: !updated.visible };
    setPortfolioVideos(portfolioVideos.map((video) => video.id === id ? nextVideo : video));
    await savePortfolioVideo(nextVideo);
  };
  const deletePortfolioVideo = async (id: string) => {
    if (!window.confirm("Excluir este vídeo do portfólio?")) return;
    setPortfolioVideos(portfolioVideos.filter((video) => video.id !== id));
    await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"deletePortfolio", id }) });
    setToast("Vídeo removido.");
  };
  const togglePortfolioEnabled = async (enabled: boolean) => { setPortfolioEnabled(enabled); await fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"portfolioEnabled", enabled }) }); setToast(enabled ? "Portfólio ativado no site." : "Portfólio ocultado do site."); };
  useEffect(() => {
    type ToolInput = { customer?: string; equipment?: string; service?: string; total?: string };
    type ToolHost = { registerTool?: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: ToolInput) => object }, options: { signal: AbortSignal }) => void | Promise<void> };
    const host = (document as Document & { modelContext?: ToolHost }).modelContext;
    if (!host?.registerTool) return;
    const lifecycle = new AbortController();
    const register = host.registerTool({
      name: "create_service_receipt",
      title: "Criar recibo de serviço",
      description: "Cria e salva um recibo com cliente, equipamento, serviço e valor total.",
      inputSchema: { type: "object", properties: { customer: { type: "string" }, equipment: { type: "string" }, service: { type: "string" }, total: { type: "string" } }, required: ["customer", "equipment", "service"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input.customer?.trim() || !input.equipment?.trim() || !input.service?.trim()) throw new Error("Cliente, equipamento e serviço são obrigatórios.");
        const created: Receipt = { ...emptyReceipt, id: crypto.randomUUID(), number: `RT-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, "0")}`, createdAt: new Date().toISOString().slice(0, 10), customer: input.customer.trim(), equipment: input.equipment.trim(), service: input.service.trim(), total: input.total?.trim() || "0,00", warranty: company.warranty };
        const next = [created, ...receipts];
        setReceipts(next); setDraft(created); setSelected(created); setPanelTab("novo"); setArea("painel"); setLogged(true);
        void fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"saveReceipt", receipt:created }) });
        return { id: created.id, number: created.number, saved: true };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(register).catch(() => undefined);
    return () => lifecycle.abort();
  }, [company.warranty, receipts]);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined); setLogged(false); window.location.href = "/" };

  if (area === "painel" && logged) return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand brand-panel"><LogoMark /><div><strong>{company.brand}</strong><span>Área do técnico</span></div></div>
        <nav>
          <PanelButton active={panelTab === "inicio"} icon={Home} label="Visão geral" onClick={() => setPanelTab("inicio")} />
          <PanelButton active={panelTab === "novo"} icon={Plus} label="Novo recibo" onClick={startReceipt} />
          <PanelButton active={panelTab === "historico"} icon={History} label="Histórico" onClick={() => setPanelTab("historico")} />
          <PanelButton active={panelTab === "avaliacoes"} icon={Star} label="Avaliações" onClick={() => setPanelTab("avaliacoes")} />
          <PanelButton active={panelTab === "portfolio"} icon={Video} label="Portfólio" onClick={() => setPanelTab("portfolio")} />
          <PanelButton active={panelTab === "config"} icon={Settings} label="Dados da empresa" onClick={() => setPanelTab("config")} />
        </nav>
        <button className="sidebar-back" onClick={() => { window.location.href = "/" }}><ChevronRight className="rotate-180" /> Ver site</button>
        <button className="sidebar-logout" onClick={logout}><LogOut /> Sair</button>
      </aside>
      {mobileOpen && <button aria-label="Fechar menu" className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <main className="panel-main">
        <header className="panel-header"><button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></button><div><span className="eyebrow">PAINEL DE CONTROLE</span><h1>{panelTab === "inicio" ? "Olá, técnico" : panelTab === "novo" ? "Recibo de serviço" : panelTab === "historico" ? "Histórico de recibos" : panelTab === "avaliacoes" ? "Avaliações dos clientes" : panelTab === "portfolio" ? "Portfólio de vídeos" : "Dados da empresa"}</h1></div><div className="panel-avatar">RT</div></header>
        {panelTab === "inicio" && <DashboardHome receipts={receipts} onNew={startReceipt} onHistory={() => setPanelTab("historico")} />}
        {panelTab === "novo" && <ReceiptEditor company={company} draft={draft} setDraft={setDraft} receipt={selected ?? draft} onSave={saveReceipt} />}
        {panelTab === "historico" && <section className="panel-section"><div className="section-toolbar"><div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, número ou aparelho" /></div><button className="primary-button compact" onClick={startReceipt}><Plus /> Novo recibo</button></div><div className="history-card">{filteredReceipts.length === 0 ? <div className="empty-state"><ReceiptText /><h3>Nenhum recibo por aqui</h3><p>Crie o primeiro recibo e ele aparecerá salvo neste histórico.</p><button className="primary-button" onClick={startReceipt}>Criar recibo</button></div> : filteredReceipts.map((receipt) => <article className="history-row" key={receipt.id}><div className="file-icon"><FileText /></div><div className="history-main"><strong>{receipt.customer}</strong><span>{receipt.number} · {receipt.equipment}</span></div><span className="status-pill"><CheckCircle2 /> {receipt.status}</span><strong className="history-total">{BRL(receipt.total)}</strong><div className="row-actions"><button title="Editar" onClick={() => editReceipt(receipt)}><Pencil /></button><button title="Duplicar" onClick={() => duplicateReceipt(receipt)}><Download /></button><button title="Imprimir" onClick={() => { setSelected(receipt); setDraft(receipt); setPanelTab("novo"); setTimeout(() => window.print(), 180) }}><Printer /></button><button title="Enviar pelo WhatsApp" disabled={!digits(receipt.customerPhone)} onClick={() => window.open(whatsappLink(receipt.customerPhone, receiptWhatsappMessage(company, receipt)), "_blank")}><MessageCircle /></button><button title="Excluir" className="danger" onClick={() => deleteReceipt(receipt.id)}><Trash2 /></button></div></article>)}</div></section>}
        {panelTab === "avaliacoes" && <section className="panel-section"><div className="history-card reviews-admin">{reviews.length === 0 ? <div className="empty-state"><Star /><h3>Nenhuma avaliação ainda</h3><p>As avaliações enviadas pelo formulário do site aparecerão aqui.</p></div> : reviews.map((review) => <article className="review-admin-row" key={review.id}><ReviewAvatar review={review} /><div className="review-admin-copy"><strong>{review.name}</strong><Stars value={review.rating} /><p>{review.text}</p></div><button className="review-delete" title="Excluir avaliação" onClick={() => deleteReview(review.id)}><Trash2 /></button></article>)}</div></section>}
        {panelTab === "portfolio" && <PortfolioAdmin enabled={portfolioEnabled} videos={portfolioVideos} onEnabledChange={togglePortfolioEnabled} onAddUrl={addPortfolioUrl} onAddFile={addPortfolioFile} onToggleVideo={togglePortfolioVideo} onDeleteVideo={deletePortfolioVideo} />}
        {panelTab === "config" && <section className="panel-section settings-wrap"><form className="settings-card" onSubmit={saveCompany}><div className="card-heading"><div><span className="eyebrow">PERSONALIZAÇÃO</span><h2>Informações automáticas dos documentos</h2></div><Settings /></div><div className="form-grid"><Field label="Nome da empresa"><input value={company.brand} onChange={(e) => setCompany({ ...company, brand: e.target.value })} /></Field><Field label="Técnico responsável"><input value={company.technician} onChange={(e) => setCompany({ ...company, technician: e.target.value })} /></Field><Field label="CPF ou CNPJ"><input value={company.document} onChange={(e) => setCompany({ ...company, document: e.target.value })} /></Field><Field label="Telefone"><input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></Field><Field label="WhatsApp com DDD"><input value={company.whatsapp} onChange={(e) => setCompany({ ...company, whatsapp: e.target.value.replace(/\D/g, "") })} /></Field><Field label="Garantia padrão"><input value={company.warranty} onChange={(e) => setCompany({ ...company, warranty: e.target.value })} /></Field><Field label="Endereço" wide><input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field></div><SignatureConfigurator company={company} setCompany={setCompany} /><button className="primary-button" type="submit"><BadgeCheck /> Salvar alterações</button></form></section>}
      </main>
      {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
    </div>
  );

  return <main className="public-site">
    <header className="site-header"><a className="brand" href="#inicio"><LogoMark /><div><strong>{company.brand}</strong><span>Assistência técnica</span></div></a><nav><a href="#servicos">Serviços</a><a href="#como-funciona">Como funciona</a>{portfolioEnabled && portfolioVideos.some((video) => video.visible) && <a href="#portfolio">Portfólio</a>}<a href="#orcamento">Orçamento</a><a href="#avaliacoes">Avaliações</a></nav><a className="member-button" href="/admin"><ShieldCheck /> Área do técnico</a></header>
    <section id="inicio" className="hero"><div className="hero-glow" /><div className="hero-copy"><span className="hero-kicker"><Sparkles /> Atendimento que resolve de verdade</span><h1>Seu aparelho funcionando. <em>Seu dia de volta.</em></h1><p>Assistência técnica com diagnóstico claro, atendimento cuidadoso e garantia no serviço. Atendimento realizado por visita agendada no local.</p><div className="hero-actions"><a className="primary-button hero-button" href="#orcamento" target="_blank" rel="noreferrer"><MessageCircle /> Pedir orçamento</a><a className="secondary-button" href="#servicos">Conhecer serviços <ChevronRight /></a></div><div className="trust-row"><span><BadgeCheck /> Serviço com garantia</span><span><Clock3 /> Visita com hora marcada</span><span><ShieldCheck /> Atendimento seguro</span></div></div><div className="hero-visual"><div className="yellow-orbit orbit-one" /><div className="yellow-orbit orbit-two" /><img src="/tecnico-3d.png" alt="Técnico de assistência com uniforme amarelo" /><div className="floating-card card-rating"><span>4,9</span><div><strong>Excelente</strong><small>clientes satisfeitos</small></div></div><div className="floating-card card-warranty"><ShieldCheck /><div><strong>Garantia</strong><small>em cada serviço</small></div></div></div></section>
    <section id="servicos" className="services-section"><div className="section-intro"><span className="eyebrow">SOLUÇÃO SEM COMPLICAÇÃO</span><h2>O cuidado certo para cada equipamento</h2><p>Do diagnóstico à entrega, você acompanha tudo com clareza.</p></div><div className="service-grid">{services.map(({ icon: Icon, title, text }) => <article className="service-card" key={title}><div className="service-icon"><Icon /></div><h3>{title}</h3><p>{text}</p><span>Saiba mais <ChevronRight /></span></article>)}</div></section>
    <section id="como-funciona" className="process-section"><div className="process-copy"><span className="eyebrow light">ATENDIMENTO TRANSPARENTE</span><h2>Você sabe o que será feito antes de aprovar.</h2><p>Sem surpresa no orçamento e sem linguagem complicada.</p><a className="light-link" href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer">Falar com o técnico <ChevronRight /></a></div><div className="steps"><Step number="01" icon={MessageCircle} title="Conte o problema" text="Preencha a prévia do orçamento e explique o defeito do aparelho." /><Step number="02" icon={Wrench} title="Receba o diagnóstico" text="Avaliamos o equipamento e apresentamos a solução." /><Step number="03" icon={PackageCheck} title="Serviço entregue" text="Você recebe o equipamento e o recibo com garantia." /></div></section>
    {portfolioEnabled && portfolioVideos.some((video) => video.visible) && <PortfolioSection videos={portfolioVideos.filter((video) => video.visible)} />}
    <QuoteSection company={company} />
    <ReviewsSection reviews={reviews} onAdd={addReview} />
    <section id="contato" className="cta-section"><div><span className="eyebrow">PODE DEIXAR COM A GENTE</span><h2>Precisa de assistência técnica?</h2><p>Chame agora e receba uma orientação inicial.</p></div><a className="primary-button hero-button" href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle /> Chamar no WhatsApp</a></section>
    <footer><div className="brand"><LogoMark /><div><strong>{company.brand}</strong><span>{company.technician}</span></div></div><p>{company.address} · {company.phone}</p><span>Atendimento com transparência e garantia.</span></footer>
    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSubmit={handleLogin} />}{toast && <div className="toast"><CheckCircle2 />{toast}</div>}
  </main>;
}

function LogoMark() { return <span className="logo-mark"><Wrench /><span className="logo-spark"><Zap /></span></span> }
function LoginModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.currentTarget === e.target && onClose()}><div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="modal-close" aria-label="Fechar" onClick={onClose}><X /></button><LogoMark /><span className="eyebrow">ACESSO RESTRITO</span><h2 id="login-title">Área do técnico</h2><p>Entre para criar, salvar e imprimir recibos de serviço.</p><form onSubmit={onSubmit}><Field label="Usuário"><input name="user" autoComplete="username" placeholder="Digite seu usuário" required /></Field><Field label="Senha"><input name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required /></Field><button className="primary-button full" type="submit">Entrar no painel <ChevronRight /></button></form></div></div> }
function PanelButton({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active: boolean; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><Icon />{label}</button> }
function DashboardHome({ receipts, onNew, onHistory }: { receipts: Receipt[]; onNew: () => void; onHistory: () => void }) { const total = receipts.reduce((sum, item) => sum + Number(item.total.replace(/\./g, "").replace(",", ".") || 0), 0); return <section className="panel-section"><div className="stats-grid"><Stat icon={ReceiptText} label="Recibos emitidos" value={String(receipts.length)} tone="yellow" /><Stat icon={CheckCircle2} label="Serviços concluídos" value={String(receipts.filter((r) => r.status === "Concluído").length)} tone="green" /><Stat icon={BadgeCheck} label="Valor registrado" value={total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} tone="dark" /></div><div className="quick-grid"><button className="quick-new" onClick={onNew}><span><Plus /></span><div><small>AÇÃO RÁPIDA</small><strong>Criar novo recibo</strong><p>Preencha os dados e gere o documento em poucos minutos.</p></div><ChevronRight /></button><article className="recent-card"><div className="card-heading"><div><small>ATIVIDADE RECENTE</small><h2>Últimos recibos</h2></div><button onClick={onHistory}>Ver todos</button></div>{receipts.length === 0 ? <div className="mini-empty"><FileText /><span>Os recibos emitidos aparecerão aqui.</span></div> : receipts.slice(0, 3).map((r) => <div className="mini-receipt" key={r.id}><span>{r.number}</span><div><strong>{r.customer}</strong><small>{r.equipment}</small></div><b>{BRL(r.total)}</b></div>)}</article></div></section> }
function Stat({ icon: Icon, label, value, tone }: { icon: typeof Home; label: string; value: string; tone: string }) { return <article className={`stat-card stat-${tone}`}><div className="stat-icon"><Icon /></div><div><span>{label}</span><strong>{value}</strong></div></article> }
function ReceiptEditor({ company, draft, setDraft, receipt, onSave }: { company: Company; draft: Receipt; setDraft: (r: Receipt) => void; receipt: Receipt; onSave: () => void }) { const set = (key: keyof Receipt, value: string) => setDraft({ ...draft, [key]: value }); return <section className="editor-layout panel-section"><div className="editor-form"><div className="editor-heading"><div><span className="eyebrow">DADOS DO ATENDIMENTO</span><h2>{draft.id ? "Editar recibo" : "Novo recibo"}</h2></div><span className="draft-badge">Rascunho automático</span></div><div className="form-block"><h3>Cliente</h3><div className="form-grid"><Field label="Nome completo"><input value={draft.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Nome do cliente" /></Field><Field label="Telefone / WhatsApp"><input value={draft.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="(21) 99999-9999" /></Field></div></div><div className="form-block"><h3>Equipamento</h3><div className="form-grid"><Field label="Tipo de equipamento"><input value={draft.equipment} onChange={(e) => set("equipment", e.target.value)} placeholder="Ex.: Máquina de lavar" /></Field><Field label="Marca e modelo"><input value={draft.brandModel} onChange={(e) => set("brandModel", e.target.value)} placeholder="Ex.: Brastemp BWK12" /></Field><Field label="Número de série"><input value={draft.serial} onChange={(e) => set("serial", e.target.value)} placeholder="Opcional" /></Field><Field label="Data"><input type="date" value={draft.createdAt} onChange={(e) => set("createdAt", e.target.value)} /></Field><Field label="Problema informado" wide><textarea value={draft.problem} onChange={(e) => set("problem", e.target.value)} placeholder="Descreva o relato do cliente" /></Field></div></div><div className="form-block"><h3>Serviço e valores</h3><div className="form-grid"><Field label="Serviço realizado" wide><textarea value={draft.service} onChange={(e) => set("service", e.target.value)} placeholder="Descreva o diagnóstico e o serviço" /></Field><Field label="Peças (R$)"><input value={draft.parts} onChange={(e) => set("parts", e.target.value)} /></Field><Field label="Mão de obra (R$)"><input value={draft.labor} onChange={(e) => set("labor", e.target.value)} /></Field><Field label="Total (R$)"><input value={draft.total} onChange={(e) => set("total", e.target.value)} /></Field><Field label="Forma de pagamento"><select value={draft.payment} onChange={(e) => set("payment", e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option></select></Field><Field label="Garantia"><input value={draft.warranty} onChange={(e) => set("warranty", e.target.value)} /></Field><Field label="Status"><select value={draft.status} onChange={(e) => set("status", e.target.value)}><option>Concluído</option><option>Em andamento</option></select></Field><Field label="Observações" wide><textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Orientações, condições da garantia ou observações" /></Field></div></div><div className="editor-actions"><button className="secondary-button" onClick={() => window.print()}><Printer /> Imprimir / salvar PDF</button><button className="whatsapp-button" disabled={!digits(draft.customerPhone)} onClick={() => window.open(whatsappLink(draft.customerPhone, receiptWhatsappMessage(company, receipt)), "_blank")}><MessageCircle /> Enviar no WhatsApp</button><button className="primary-button" onClick={onSave}><BadgeCheck /> Salvar recibo</button></div></div><ReceiptPreview company={company} receipt={receipt} /></section> }
function ReceiptPreview({ company, receipt }: { company: Company; receipt: Receipt }) { return <aside className="preview-column"><span className="preview-label">PRÉVIA DO RECIBO</span><article className="receipt-paper" id="receipt-print"><div className="receipt-watermark" aria-hidden="true"><LogoMark /><strong>{company.brand}</strong></div><header><div className="receipt-brand"><LogoMark /><div><strong>{company.brand}</strong><span>Assistência técnica</span></div></div><div className="receipt-number"><span>RECIBO DE SERVIÇO</span><strong>{receipt.number || "RT-0000-0000"}</strong></div></header><div className="company-line"><span>{company.technician}</span><span>{company.document}</span><span>{company.phone}</span><span>{company.address}</span></div><div className="receipt-title"><div><small>CLIENTE</small><strong>{receipt.customer || "Nome do cliente"}</strong><span>{receipt.customerPhone || "Telefone"}</span></div><div><small>DATA</small><strong>{receipt.createdAt ? new Date(`${receipt.createdAt}T12:00:00`).toLocaleDateString("pt-BR") : "--/--/----"}</strong></div></div><div className="receipt-info-grid"><div><small>EQUIPAMENTO</small><strong>{receipt.equipment || "Não informado"}</strong></div><div><small>MARCA / MODELO</small><strong>{receipt.brandModel || "Não informado"}</strong></div><div><small>NÚMERO DE SÉRIE</small><strong>{receipt.serial || "Não informado"}</strong></div><div><small>GARANTIA</small><strong>{receipt.warranty || company.warranty}</strong></div></div><div className="receipt-description"><small>PROBLEMA INFORMADO</small><p>{receipt.problem || "Descrição informada pelo cliente."}</p><small>SERVIÇO REALIZADO</small><p>{receipt.service || "Descrição do diagnóstico e do serviço realizado."}</p>{receipt.notes && <><small>OBSERVAÇÕES</small><p>{receipt.notes}</p></>}</div><div className="receipt-values"><div><span>Peças</span><strong>{BRL(receipt.parts)}</strong></div><div><span>Mão de obra</span><strong>{BRL(receipt.labor)}</strong></div><div className="receipt-total"><span>Total</span><strong>{BRL(receipt.total)}</strong></div><small>Pagamento: {receipt.payment}</small></div><DocumentSignature company={company} /><div className="signature"><span /><strong>{company.technician}</strong><small>Técnico responsável</small></div><footer><ShieldCheck /><span>Serviço registrado com transparência e garantia.</span></footer></article><div className="preview-actions"><button className="print-button" onClick={() => window.print()}><Printer /> Imprimir ou salvar em PDF</button><button className="whatsapp-button full-action" disabled={!digits(receipt.customerPhone)} onClick={() => window.open(whatsappLink(receipt.customerPhone, receiptWhatsappMessage(company, receipt)), "_blank")}><MessageCircle /> Abrir WhatsApp do cliente</button></div></aside> }

function DocumentSignature({ company }: { company: Company }) {
  if (!company.signatureSrc) return null;
  const x = Number.isFinite(company.signatureX) ? company.signatureX : 50;
  const y = Number.isFinite(company.signatureY) ? company.signatureY : 82;
  const width = Number.isFinite(company.signatureWidth) ? company.signatureWidth : 28;
  return <img className="document-signature-image" src={company.signatureSrc} alt="Assinatura do técnico" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%` }} />;
}

function SignatureConfigurator({ company, setCompany }: { company: Company; setCompany: (company: Company) => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const x = Number.isFinite(company.signatureX) ? company.signatureX : 50;
  const y = Number.isFinite(company.signatureY) ? company.signatureY : 82;
  const width = Number.isFinite(company.signatureWidth) ? company.signatureWidth : 28;

  const uploadSignature = async (file?: File) => {
    if (!file) return;
    if (file.type !== "image/png") return setMessage("A assinatura precisa ser um arquivo PNG com fundo transparente.");
    if (file.size > 5_000_000) return setMessage("Use um PNG de até 5 MB.");
    setUploading(true); setMessage("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("id", "assinatura-oficial"); form.append("kind", "signature");
      const response = await fetch("/api/media", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha no upload");
      setCompany({ ...company, signatureSrc: payload.src, signatureX: x, signatureY: y, signatureWidth: width });
      setMessage("Assinatura enviada. Clique em Salvar alterações para deixá-la permanente.");
    } catch (error) {
      setMessage(`Não foi possível enviar a assinatura: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally { setUploading(false); }
  };

  const moveFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(event.buttons & 1)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
    const nextY = Math.max(4, Math.min(96, ((event.clientY - rect.top) / rect.height) * 100));
    setCompany({ ...company, signatureX: Math.round(nextX * 10) / 10, signatureY: Math.round(nextY * 10) / 10 });
  };

  return <div className="signature-config">
    <div className="signature-config-head"><div><span className="eyebrow">ASSINATURA PADRÃO</span><h3>Assinatura automática nos documentos</h3><p>Envie uma única vez a assinatura em PNG. Ela fica salva na nuvem e será usada automaticamente nos recibos e nos documentos/PDFs que utilizarem o padrão da empresa.</p></div><Upload /></div>
    <div className="signature-config-grid">
      <div className="signature-controls">
        <label className="signature-upload"><input type="file" accept="image/png,.png" onChange={(e) => uploadSignature(e.target.files?.[0])} disabled={uploading} /><Upload /><div><strong>{uploading ? "Enviando..." : company.signatureSrc ? "Trocar assinatura PNG" : "Enviar assinatura PNG"}</strong><small>Preferencialmente fundo transparente · até 5 MB</small></div></label>
        {company.signatureSrc && <button type="button" className="secondary-button signature-remove" onClick={() => setCompany({ ...company, signatureSrc: "" })}><Trash2 /> Remover assinatura</button>}
        <label className="signature-range"><span>Tamanho <b>{Math.round(width)}%</b></span><input type="range" min="10" max="55" step="1" value={width} onChange={(e) => setCompany({ ...company, signatureWidth: Number(e.target.value) })} /></label>
        <div className="signature-coordinates"><span>Posição X: <b>{x.toFixed(1)}%</b></span><span>Posição Y: <b>{y.toFixed(1)}%</b></span></div>
        <button type="button" className="secondary-button" onClick={() => setCompany({ ...company, signatureX: 50, signatureY: 82, signatureWidth: 28 })}>Restaurar posição padrão</button>
        {message && <p className="signature-message">{message}</p>}
      </div>
      <div><span className="signature-preview-label">Arraste a assinatura para a posição desejada</span><div className="signature-position-preview" onPointerMove={moveFromPointer} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveFromPointer(e); }}>
        <div className="signature-preview-lines"><b>RECIBO / DOCUMENTO</b><span /><span /><span /><span /></div>
        {company.signatureSrc ? <img draggable={false} src={company.signatureSrc} alt="Prévia da assinatura" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%` }} /> : <div className="signature-preview-empty">Envie o PNG da assinatura para posicioná-la</div>}
      </div></div>
    </div>
  </div>;
}

function Stars({ value, onChange }: { value: number; onChange?: (value: number) => void }) { return <div className="stars" aria-label={`${value} de 5 estrelas`}>{[1,2,3,4,5].map((star) => <button key={star} type="button" className={star <= value ? "star active" : "star"} onClick={() => onChange?.(star)} disabled={!onChange} aria-label={`${star} estrela${star > 1 ? "s" : ""}`}><Star /></button>)}</div> }
function ReviewAvatar({ review }: { review: Review }) { return review.photo ? <img className="review-avatar" src={review.photo} alt={`Foto de ${review.name}`} /> : <div className="review-avatar review-avatar-fallback">{review.name.trim().slice(0,1).toUpperCase() || "C"}</div> }
function ReviewsSection({ reviews, onAdd }: { reviews: Review[]; onAdd: (review: Omit<Review, "id" | "createdAt">) => void }) {
  const [name, setName] = useState(""); const [text, setText] = useState(""); const [rating, setRating] = useState(5); const [photo, setPhoto] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim() || !text.trim()) return; onAdd({ name: name.trim(), text: text.trim(), rating, photo }); setName(""); setText(""); setRating(5); setPhoto("") };
  const pickPhoto = (file?: File) => { if (!file) return; if (file.size > 2_500_000) return alert("Escolha uma foto de até 2,5 MB."); const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result || "")); reader.readAsDataURL(file) };
  return <section id="avaliacoes" className="reviews-section"><div className="section-intro"><span className="eyebrow">EXPERIÊNCIA DOS CLIENTES</span><h2>Avaliações de quem já foi atendido</h2><p>Deixe sua avaliação, escolha de 1 a 5 estrelas e, se quiser, adicione sua foto.</p></div><div className="reviews-layout"><div className="reviews-list">{reviews.length === 0 ? <div className="reviews-empty"><Star /><h3>As primeiras avaliações aparecerão aqui.</h3><p>O formulário já está pronto para receber foto, comentário e nota.</p></div> : reviews.slice(0,6).map((review) => <article className="review-card" key={review.id}><div className="review-head"><ReviewAvatar review={review} /><div><strong>{review.name}</strong><Stars value={review.rating} /></div></div><p>“{review.text}”</p></article>)}</div><form className="review-form" onSubmit={submit}><span className="eyebrow">DEIXE SUA AVALIAÇÃO</span><h3>Como foi seu atendimento?</h3><Field label="Seu nome"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" required /></Field><div className="rating-field"><span>Sua nota</span><Stars value={rating} onChange={setRating} /></div><Field label="Sua avaliação"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Conte como foi o atendimento" required /></Field><label className="photo-upload"><input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} /><span className="upload-preview">{photo ? <img src={photo} alt="Prévia da foto" /> : <Upload />}</span><div><strong>{photo ? "Foto selecionada" : "Adicionar uma foto"}</strong><small>Opcional · JPG ou PNG</small></div></label><button className="primary-button full" type="submit"><Star /> Enviar avaliação</button></form></div></section>
}

function PortfolioVideoPlayer({ video, compact = false }: { video: PortfolioVideo; compact?: boolean }) {
  const [shape, setShape] = useState<"portrait" | "square" | "landscape">("landscape");
  const metadata = (event: React.SyntheticEvent<HTMLVideoElement>) => { const el = event.currentTarget; if (!el.videoWidth || !el.videoHeight) return; const ratio = el.videoWidth / el.videoHeight; setShape(ratio > 1.2 ? "landscape" : ratio < .82 ? "portrait" : "square"); };
  return <div className={`portfolio-video-card ${shape} ${compact ? "compact" : ""}`}><div className="portfolio-video-frame">{video.src ? <video src={video.src} controls playsInline preload="metadata" onLoadedMetadata={metadata}>Seu navegador não conseguiu reproduzir este formato de vídeo.</video> : <div className="video-missing"><Video /><span>Vídeo indisponível.</span></div>}</div>{!compact && <div className="portfolio-video-caption"><PlayCircle /><strong>{video.title}</strong></div>}</div>;
}
function PortfolioSection({ videos }: { videos: PortfolioVideo[] }) { return <section id="portfolio" className="portfolio-section"><div className="section-intro"><span className="eyebrow">SERVIÇOS NA PRÁTICA</span><h2>Veja alguns trabalhos realizados</h2><p>Vídeos reais do atendimento e dos equipamentos. Cada mídia se adapta automaticamente ao formato original, sem distorção.</p></div><div className="portfolio-grid">{videos.map((video) => <PortfolioVideoPlayer key={video.id} video={video} />)}</div></section> }
function PortfolioAdmin({ enabled, videos, onEnabledChange, onAddUrl, onAddFile, onToggleVideo, onDeleteVideo }: { enabled: boolean; videos: PortfolioVideo[]; onEnabledChange: (enabled:boolean)=>void; onAddUrl:(title:string,src:string)=>void; onAddFile:(title:string,file?:File)=>void; onToggleVideo:(id:string)=>void; onDeleteVideo:(id:string)=>void }) {
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [file, setFile] = useState<File | undefined>();
  const addUrl = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onAddUrl(title, url); setTitle(""); setUrl(""); };
  const addFile = async () => { if (!file) return; await onAddFile(title, file); setTitle(""); setFile(undefined); const input = document.getElementById("portfolio-file") as HTMLInputElement | null; if (input) input.value = ""; };
  return <section className="panel-section portfolio-admin"><div className="portfolio-toggle-card"><div><span className="eyebrow">VISIBILIDADE</span><h2>Portfólio na página inicial</h2><p>O bloco inteiro só aparece para visitantes quando esta opção estiver ativada.</p></div><label className="portfolio-switch"><input type="checkbox" checked={enabled} onChange={(e)=>onEnabledChange(e.target.checked)} /><span>{enabled ? "Ativado" : "Desativado"}</span></label></div><div className="portfolio-admin-grid"><form className="settings-card" onSubmit={addUrl}><div className="card-heading"><div><span className="eyebrow">ADICIONAR POR LINK</span><h2>Vídeo hospedado</h2></div><Video /></div><Field label="Título do vídeo"><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ex.: Manutenção de lavadora" /></Field><Field label="Link direto do vídeo"><input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://.../video.mp4" /></Field><button className="primary-button" type="submit"><Plus /> Adicionar vídeo</button></form><div className="settings-card"><div className="card-heading"><div><span className="eyebrow">UPLOAD LOCAL</span><h2>Enviar arquivo</h2></div><Upload /></div><Field label="Título do vídeo"><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Ex.: Antes e depois" /></Field><label className="portfolio-file"><input id="portfolio-file" type="file" accept="video/*,.mp4,.webm,.ogg,.ogv,.mov,.m4v,.avi,.mkv" onChange={(e)=>setFile(e.target.files?.[0])} /><Upload /><div><strong>{file ? file.name : "Selecionar vídeo"}</strong><small>MP4, WebM, OGG, MOV, M4V e outros formatos que o navegador conseguir reproduzir.</small></div></label><button className="primary-button" type="button" onClick={addFile} disabled={!file}><Upload /> Enviar para o portfólio</button></div></div><div className="portfolio-admin-list"><div className="portfolio-list-head"><div><span className="eyebrow">VÍDEOS CADASTRADOS</span><h2>{videos.length} {videos.length === 1 ? "vídeo" : "vídeos"}</h2></div></div>{videos.length === 0 ? <div className="empty-state"><Video /><h3>Nenhum vídeo ainda</h3><p>Envie um arquivo ou adicione um link direto para começar.</p></div> : videos.map((video)=><article className="portfolio-admin-row" key={video.id}><PortfolioVideoPlayer video={video} compact /><div className="portfolio-admin-copy"><strong>{video.title}</strong><span>{video.sourceType === "file" ? "Arquivo enviado" : "Link externo"} · {video.visible ? "visível no site" : "oculto"}</span></div><div className="portfolio-row-actions"><button title={video.visible ? "Ocultar do site" : "Mostrar no site"} onClick={()=>onToggleVideo(video.id)}>{video.visible ? <Eye /> : <EyeOff />}</button><button className="danger" title="Excluir vídeo" onClick={()=>onDeleteVideo(video.id)}><Trash2 /></button></div></article>)}</div><div className="portfolio-info"><ShieldCheck /><p><strong>Adaptação automática:</strong> o player detecta as dimensões reais do vídeo. Horizontal ocupa proporção ampla, vertical fica em coluna alta e vídeos próximos de 1:1 ficam quadrados, sempre mantendo o conteúdo inteiro sem esticar.</p></div></section>
}

function QuoteSection({ company }: { company: Company }) {
  const [form, setForm] = useState({ name:"", phone:"", equipment:"", problem:"", wantsVisit:true, address:"", date:"", time:"" });
  const set = (key: keyof typeof form, value: string | boolean) => setForm({ ...form, [key]: value });
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const visit = form.wantsVisit ? `Sim. Endereço/local: ${form.address || "a combinar"}. Data preferida: ${form.date || "a combinar"} ${form.time || ""}.` : "Ainda não quero agendar visita, desejo uma orientação inicial."; let calendar = ""; if (form.wantsVisit && form.date && form.time) { const start = `${form.date.replace(/-/g,"")}T${form.time.replace(":","")}00`; const endDate = new Date(`${form.date}T${form.time}:00`); endDate.setMinutes(endDate.getMinutes()+60); const end = `${endDate.getFullYear()}${String(endDate.getMonth()+1).padStart(2,"0")}${String(endDate.getDate()).padStart(2,"0")}T${String(endDate.getHours()).padStart(2,"0")}${String(endDate.getMinutes()).padStart(2,"0")}00`; const params = new URLSearchParams({ action:"TEMPLATE", text:`Visita ${company.brand} - ${form.name}`, dates:`${start}/${end}`, details:`Cliente: ${form.name}\nTelefone: ${form.phone}\nEquipamento: ${form.equipment}\nProblema: ${form.problem}`, location:form.address || "Rio de Janeiro - RJ" }); calendar = `\n\n📅 Link para adicionar esta visita ao Google Agenda: https://calendar.google.com/calendar/render?${params.toString()}`; } const message = `Olá! Gostaria de solicitar uma avaliação/orçamento.\n\nNome: ${form.name}\nTelefone: ${form.phone}\nEquipamento: ${form.equipment}\nProblema/defeito: ${form.problem}\nVisita técnica: ${visit}${calendar}`; void fetch("/api/data", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ action:"quote", quote:{ ...form, createdAt:new Date().toISOString() } }) }); window.open(whatsappLink(company.whatsapp, message), "_blank") };
  return <section id="orcamento" className="quote-section"><div className="quote-copy"><span className="eyebrow light">PRÉ-ATENDIMENTO</span><h2>Conte o defeito antes da visita.</h2><p>Você já adianta as informações principais e o técnico recebe tudo organizado no WhatsApp para orientar o atendimento.</p><div className="visit-note"><MapPin /><div><strong>Atendimento por visita agendada</strong><span>Informe o aparelho, o defeito e, se quiser, uma data preferida.</span></div></div></div><form className="quote-form" onSubmit={submit}><div className="form-grid"><Field label="Seu nome"><input value={form.name} onChange={(e)=>set("name",e.target.value)} placeholder="Nome completo" required /></Field><Field label="WhatsApp"><input value={form.phone} onChange={(e)=>set("phone",e.target.value)} placeholder="(21) 99999-9999" required /></Field><Field label="Qual é o aparelho?"><input value={form.equipment} onChange={(e)=>set("equipment",e.target.value)} placeholder="Ex.: máquina de lavar, TV..." required /></Field><Field label="Qual é o problema?" wide><textarea value={form.problem} onChange={(e)=>set("problem",e.target.value)} placeholder="Explique o defeito, ruído, mensagem de erro ou o que deixou de funcionar" required /></Field></div><label className="visit-toggle"><input type="checkbox" checked={form.wantsVisit} onChange={(e)=>set("wantsVisit",e.target.checked)} /><span><strong>Quero solicitar uma visita técnica</strong><small>O horário só é confirmado após o técnico responder.</small></span></label>{form.wantsVisit && <div className="visit-fields"><Field label="Endereço / bairro"><input value={form.address} onChange={(e)=>set("address",e.target.value)} placeholder="Bairro ou endereço da visita" /></Field><Field label="Data preferida"><input type="date" value={form.date} onChange={(e)=>set("date",e.target.value)} /></Field><Field label="Horário preferido"><input type="time" value={form.time} onChange={(e)=>set("time",e.target.value)} /></Field></div>}<button className="primary-button full quote-submit" type="submit"><Send /> Enviar pré-atendimento pelo WhatsApp</button><p className="form-footnote"><CalendarDays /> Se informar data e horário, a mensagem também leva um link para o técnico adicionar a visita ao Google Agenda.</p></form></section>
}
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "field wide" : "field"}><span>{label}</span>{children}</label> }
function Step({ number, icon: Icon, title, text }: { number: string; icon: typeof Home; title: string; text: string }) { return <article className="step"><span className="step-number">{number}</span><div className="step-icon"><Icon /></div><h3>{title}</h3><p>{text}</p></article> }
