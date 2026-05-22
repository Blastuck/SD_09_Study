import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dhlkpkqlevmgdrlgdkui.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mFFtiFeBffanC2Tq2-7Vqg_MmqXQPiW";
const SITE_PASSWORD = "0909";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const N = {
  bg: "#ffffff",
  sidebar: "#f7f7f5",
  hover: "#ebebea",
  active: "#e3e2e0",
  border: "#e9e9e7",
  text: "#37352f",
  textMuted: "#9b9a97",
  textLight: "#c7c6c3",
  blue: "#2eaadc",
  blueBg: "#e8f4f9",
  red: "#e03e3e",
  font: "'Segoe UI', ui-sans-serif, -apple-system, sans-serif",
};

function md(text) {
  if (!text) return "";
  let t = text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, "<ul>$&</ul>");
  t = t.split("\n\n").map(p => p.startsWith("<") ? p : `<p>${p}</p>`).join("");
  return t;
}

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = e => {
    e.preventDefault();
    if (pw === SITE_PASSWORD) { sessionStorage.setItem("wauth", "1"); onUnlock(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:N.bg, fontFamily:N.font }}>
      <div style={{ width:300, textAlign:"center" }}>
        <div style={{ width:60, height:60, borderRadius:12, background:N.sidebar, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px" }}>🔒</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:N.text, margin:"0 0 6px" }}>팀 위키</h2>
        <p style={{ fontSize:14, color:N.textMuted, margin:"0 0 24px" }}>계속하려면 비밀번호를 입력하세요</p>
        <form onSubmit={submit}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호" autoFocus
            style={{ width:"100%", padding:"8px 12px", border:`1px solid ${err ? N.red : N.border}`, borderRadius:6, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:8, color:N.text, fontFamily:N.font, transition:"border .15s" }} />
          {err && <p style={{ color:N.red, fontSize:13, margin:"0 0 8px" }}>비밀번호가 틀렸습니다</p>}
          <button type="submit" style={{ width:"100%", padding:"8px", background:"#000", color:"#fff", border:"none", borderRadius:6, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:N.font }}>입장하기</button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("wauth") === "1");
  const [view, setView] = useState("list");
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterCat, setFilterCat] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: arts }, { data: cats }, { data: tgs }] = await Promise.all([
      supabase.from("articles").select("*, categories(name), article_tags(tag_id, tags(name))").order("updated_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("tags").select("*").order("name"),
    ]);
    setArticles(arts || []); setCategories(cats || []); setTags(tgs || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;

  const filtered = articles.filter(a => {
    if (filterCat && a.category_id !== filterCat) return false;
    if (filterTag && !a.article_tags?.some(at => at.tag_id === filterTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    }
    return true;
  });

  const pageTitle = filterCat ? categories.find(c => c.id === filterCat)?.name
    : filterTag ? `# ${tags.find(t => t.id === filterTag)?.name}`
    : "모든 페이지";

  if (view === "detail" && selected) return (
    <Layout categories={categories} tags={tags} filterCat={filterCat} filterTag={filterTag}
      onCat={id => { setFilterCat(id); setFilterTag(null); setView("list"); }}
      onTag={id => { setFilterTag(id); setFilterCat(null); setView("list"); }}
      onNew={() => { setSelected(null); setView("edit"); }}
      onHome={() => { setFilterCat(null); setFilterTag(null); setView("list"); }}
      searchOpen={searchOpen} setSearchOpen={setSearchOpen} search={search} setSearch={setSearch}>
      <DetailView article={selected} onBack={() => { setView("list"); setSelected(null); }} onEdit={() => setView("edit")}
        onDelete={async () => { await supabase.from("articles").delete().eq("id", selected.id); setView("list"); setSelected(null); fetchAll(); }} />
    </Layout>
  );

  if (view === "edit") return (
    <Layout categories={categories} tags={tags} filterCat={filterCat} filterTag={filterTag}
      onCat={id => { setFilterCat(id); setFilterTag(null); setView("list"); }}
      onTag={id => { setFilterTag(id); setFilterCat(null); setView("list"); }}
      onNew={() => { setSelected(null); setView("edit"); }}
      onHome={() => { setFilterCat(null); setFilterTag(null); setView("list"); }}
      searchOpen={searchOpen} setSearchOpen={setSearchOpen} search={search} setSearch={setSearch}>
      <EditView article={selected} categories={categories} tags={tags}
        onSave={async data => {
          let id = selected?.id;
          if (id) await supabase.from("articles").update({ title: data.title, content: data.content, category_id: data.categoryId }).eq("id", id);
          else { const { data: c } = await supabase.from("articles").insert({ title: data.title, content: data.content, category_id: data.categoryId }).select().single(); id = c.id; }
          await supabase.from("article_tags").delete().eq("article_id", id);
          if (data.tagIds.length) await supabase.from("article_tags").insert(data.tagIds.map(tid => ({ article_id: id, tag_id: tid })));
          await fetchAll(); setView("list"); setSelected(null);
        }}
        onCancel={() => setView(selected ? "detail" : "list")} />
    </Layout>
  );

  return (
    <Layout categories={categories} tags={tags} filterCat={filterCat} filterTag={filterTag}
      onCat={id => { setFilterCat(id); setFilterTag(null); }}
      onTag={id => { setFilterTag(id); setFilterCat(null); }}
      onNew={() => { setSelected(null); setView("edit"); }}
      onHome={() => { setFilterCat(null); setFilterTag(null); }}
      searchOpen={searchOpen} setSearchOpen={setSearchOpen} search={search} setSearch={setSearch}>
      <div style={{ padding:"40px 96px", maxWidth:900, fontFamily:N.font }}>
        <h1 style={{ fontSize:36, fontWeight:700, color:N.text, margin:"0 0 4px", letterSpacing:"-0.02em" }}>{pageTitle}</h1>
        <p style={{ fontSize:13, color:N.textMuted, margin:"0 0 32px" }}>{filtered.length}개의 페이지</p>

        {loading ? (
          <p style={{ color:N.textMuted, fontSize:14 }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => { setSelected(null); setView("edit"); }} />
        ) : (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", padding:"0 8px 6px", borderBottom:`1px solid ${N.border}`, marginBottom:4 }}>
              <span style={{ fontSize:12, color:N.textMuted, fontWeight:500 }}>제목</span>
              <span style={{ fontSize:12, color:N.textMuted, fontWeight:500, width:100, textAlign:"right" }}>카테고리</span>
              <span style={{ fontSize:12, color:N.textMuted, fontWeight:500, width:80, textAlign:"right" }}>수정일</span>
            </div>
            {filtered.map(a => (
              <ArticleRow key={a.id} article={a} onClick={() => { setSelected(a); setView("detail"); }} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Layout({ children, categories, tags, filterCat, filterTag, onCat, onTag, onNew, onHome, searchOpen, setSearchOpen, search, setSearch }) {
  const [catOpen, setCatOpen] = useState(true);
  const [tagOpen, setTagOpen] = useState(true);

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:N.font, background:N.bg }}>
      <aside style={{ width:240, minHeight:"100vh", background:N.sidebar, display:"flex", flexDirection:"column", flexShrink:0, borderRight:`1px solid ${N.border}` }}>
        {/* 워크스페이스 헤더 */}
        <div style={{ padding:"12px 14px 8px" }}>
          <NavBtn onClick={onHome} style={{ fontWeight:600, fontSize:14, color:N.text, gap:8, padding:"6px 8px" }}>
            <span style={{ fontSize:20 }}>📚</span> 팀 위키
          </NavBtn>
        </div>

        {/* 검색 */}
        <div style={{ padding:"2px 14px 4px" }}>
          <NavBtn onClick={() => setSearchOpen(p => !p)} style={{ color:N.textMuted, fontSize:13 }}>
            <SideIcon>🔍</SideIcon> 검색
          </NavBtn>
          {searchOpen && (
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색어 입력..." autoFocus
              style={{ width:"100%", marginTop:4, padding:"6px 10px", border:`1px solid ${N.border}`, borderRadius:6, fontSize:13, outline:"none", background:"#fff", color:N.text, fontFamily:N.font, boxSizing:"border-box" }} />
          )}
        </div>

        {/* 새 페이지 */}
        <div style={{ padding:"2px 14px" }}>
          <NavBtn onClick={onNew} style={{ color:N.textMuted, fontSize:13 }}>
            <SideIcon>✏️</SideIcon> 새 페이지
          </NavBtn>
        </div>

        <div style={{ height:1, background:N.border, margin:"8px 14px" }} />

        {/* 모든 페이지 */}
        <div style={{ padding:"0 14px 2px" }}>
          <NavBtn onClick={() => onCat(null)} active={!filterCat && !filterTag} style={{ fontSize:13, color: (!filterCat && !filterTag) ? N.text : N.textMuted }}>
            <SideIcon>🏠</SideIcon> 모든 페이지
          </NavBtn>
        </div>

        {/* 카테고리 */}
        {categories.length > 0 && (
          <div style={{ padding:"8px 14px 2px" }}>
            <button onClick={() => setCatOpen(p => !p)}
              style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:N.textMuted, fontSize:11, fontWeight:600, letterSpacing:"0.06em", padding:"2px 6px", textTransform:"uppercase" }}>
              <span style={{ display:"inline-block", transform: catOpen?"rotate(90deg)":"rotate(0deg)", transition:".15s", fontSize:10 }}>▶</span> 카테고리
            </button>
            {catOpen && categories.map(c => (
              <NavBtn key={c.id} onClick={() => onCat(c.id)} active={filterCat === c.id}
                style={{ fontSize:13, color: filterCat===c.id ? N.text : N.textMuted, paddingLeft:20 }}>
                <SideIcon>📁</SideIcon>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
              </NavBtn>
            ))}
          </div>
        )}

        {/* 태그 */}
        {tags.length > 0 && (
          <div style={{ padding:"8px 14px 2px" }}>
            <button onClick={() => setTagOpen(p => !p)}
              style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:N.textMuted, fontSize:11, fontWeight:600, letterSpacing:"0.06em", padding:"2px 6px", textTransform:"uppercase" }}>
              <span style={{ display:"inline-block", transform: tagOpen?"rotate(90deg)":"rotate(0deg)", transition:".15s", fontSize:10 }}>▶</span> 태그
            </button>
            {tagOpen && tags.map(t => (
              <NavBtn key={t.id} onClick={() => onTag(t.id)} active={filterTag === t.id}
                style={{ fontSize:13, color: filterTag===t.id ? N.text : N.textMuted, paddingLeft:20 }}>
                <SideIcon style={{ fontSize:12 }}>#</SideIcon>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
              </NavBtn>
            ))}
          </div>
        )}

        {/* 하단 여백 */}
        <div style={{ flex:1 }} />
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${N.border}` }}>
          <p style={{ fontSize:12, color:N.textLight, margin:0 }}>팀 위키 · 무료 플랜</p>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main style={{ flex:1, overflow:"auto" }}>{children}</main>
    </div>
  );
}

function NavBtn({ children, onClick, active, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"5px 8px", border:"none", borderRadius:4, cursor:"pointer", textAlign:"left", fontFamily:N.font, background: active ? N.active : hov ? N.hover : "transparent", ...style }}>
      {children}
    </button>
  );
}

function SideIcon({ children, style = {} }) {
  return <span style={{ fontSize:14, width:18, textAlign:"center", flexShrink:0, ...style }}>{children}</span>;
}

function ArticleRow({ article: a, onClick }) {
  const [hov, setHov] = useState(false);
  const tags = a.article_tags?.map(at => at.tags?.name).filter(Boolean) || [];
  const date = new Date(a.updated_at).toLocaleDateString("ko-KR", { month:"short", day:"numeric" });

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:12, padding:"6px 8px", borderRadius:4, cursor:"pointer", background: hov ? N.hover : "transparent", transition:"background .1s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
        <span style={{ fontSize:15, flexShrink:0 }}>📄</span>
        <span style={{ fontSize:14, fontWeight:500, color:N.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.title}</span>
        {tags.length > 0 && tags.slice(0,2).map(t => (
          <span key={t} style={{ fontSize:11, background:"#f1f0ee", color:"#787774", borderRadius:3, padding:"1px 6px", flexShrink:0 }}>#{t}</span>
        ))}
      </div>
      <span style={{ fontSize:12, color:N.textMuted, width:100, textAlign:"right", whiteSpace:"nowrap" }}>
        {a.categories?.name || "—"}
      </span>
      <span style={{ fontSize:12, color:N.textLight, width:80, textAlign:"right" }}>{date}</span>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div style={{ textAlign:"center", padding:"80px 0" }}>
      <p style={{ fontSize:48, margin:"0 0 12px" }}>📭</p>
      <p style={{ fontSize:16, fontWeight:500, color:N.text, margin:"0 0 6px" }}>페이지가 없습니다</p>
      <p style={{ fontSize:14, color:N.textMuted, margin:"0 0 20px" }}>새 페이지를 만들어 시작하세요</p>
      <button onClick={onNew} style={{ padding:"8px 20px", background:"#000", color:"#fff", border:"none", borderRadius:6, fontSize:14, cursor:"pointer", fontFamily:N.font }}>
        + 새 페이지
      </button>
    </div>
  );
}

function DetailView({ article: a, onBack, onEdit, onDelete }) {
  const tags = a.article_tags?.map(at => at.tags?.name).filter(Boolean) || [];
  const date = new Date(a.updated_at).toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" });

  return (
    <div style={{ fontFamily:N.font }}>
      {/* 상단 바 */}
      <div style={{ height:44, display:"flex", alignItems:"center", padding:"0 16px", gap:4, borderBottom:`1px solid ${N.border}` }}>
        <TopBtn onClick={onBack}>← 뒤로</TopBtn>
        <div style={{ flex:1 }} />
        <TopBtn onClick={onEdit}>편집</TopBtn>
        <TopBtn onClick={() => { if(confirm("정말 삭제할까요?")) onDelete(); }} danger>삭제</TopBtn>
      </div>

      {/* 페이지 본문 */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"60px 96px 100px" }}>
        <h1 style={{ fontSize:40, fontWeight:700, color:N.text, margin:"0 0 12px", lineHeight:1.2, letterSpacing:"-0.02em" }}>{a.title}</h1>

        {/* 속성 행 */}
        <div style={{ marginBottom:32 }}>
          <PropRow icon="🗓️" label="수정일" value={date} />
          {a.categories?.name && <PropRow icon="📁" label="카테고리" value={a.categories.name} />}
          {tags.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:`1px solid ${N.border}` }}>
              <span style={{ fontSize:13, color:N.textMuted, width:80 }}>🏷️ 태그</span>
              <div style={{ display:"flex", gap:4 }}>
                {tags.map(t => <span key={t} style={{ fontSize:12, background:"#f1f0ee", color:"#787774", borderRadius:3, padding:"2px 8px" }}>#{t}</span>)}
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop:`1px solid ${N.border}`, paddingTop:32 }}>
          <div className="notion-content" dangerouslySetInnerHTML={{ __html: md(a.content) }} />
        </div>
      </div>

      <style>{`
        .notion-content { font-size:16px; line-height:1.75; color:${N.text}; }
        .notion-content h1 { font-size:28px; font-weight:700; margin:32px 0 8px; }
        .notion-content h2 { font-size:22px; font-weight:600; margin:24px 0 6px; }
        .notion-content h3 { font-size:18px; font-weight:600; margin:20px 0 4px; }
        .notion-content p { margin:4px 0; }
        .notion-content ul { padding-left:20px; margin:4px 0; }
        .notion-content li { margin:2px 0; }
        .notion-content code { background:#f7f6f3; border-radius:3px; padding:2px 6px; font-size:14px; font-family:monospace; }
        .notion-content blockquote { border-left:3px solid ${N.border}; margin:8px 0; padding:4px 16px; color:${N.textMuted}; }
        .notion-content hr { border:none; border-top:1px solid ${N.border}; margin:20px 0; }
        .notion-content strong { font-weight:600; }
      `}</style>
    </div>
  );
}

function PropRow({ icon, label, value }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:`1px solid ${N.border}` }}>
      <span style={{ fontSize:13, color:N.textMuted, width:80 }}>{icon} {label}</span>
      <span style={{ fontSize:13, color:N.text }}>{value}</span>
    </div>
  );
}

function TopBtn({ children, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding:"4px 10px", border:"none", borderRadius:4, background: hov ? N.hover : "transparent", color: danger ? N.red : N.textMuted, fontSize:13, cursor:"pointer", fontFamily:N.font }}>
      {children}
    </button>
  );
}

function EditView({ article, categories, tags, onSave, onCancel }) {
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [categoryId, setCategoryId] = useState(article?.category_id || "");
  const [selectedTags, setSelectedTags] = useState(article?.article_tags?.map(at => at.tag_id) || []);
  const [tab, setTab] = useState("write");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const toggleTag = id => setSelectedTags(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = async () => {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    await onSave({ title, content, categoryId: categoryId || null, tagIds: selectedTags });
    setSaving(false);
  };

  return (
    <div style={{ fontFamily:N.font }}>
      {/* 상단 바 */}
      <div style={{ height:44, display:"flex", alignItems:"center", padding:"0 16px", gap:4, borderBottom:`1px solid ${N.border}` }}>
        <TopBtn onClick={onCancel}>← 취소</TopBtn>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", gap:4 }}>
          {["write","preview"].map(t => (
            <TopBtn key={t} onClick={() => setTab(t)} style={{ color: tab===t ? N.text : N.textMuted, fontWeight: tab===t ? 500 : 400 }}>
              {t === "write" ? "작성" : "미리보기"}
            </TopBtn>
          ))}
        </div>
        <div style={{ width:1, height:18, background:N.border, margin:"0 4px" }} />
        <button onClick={save} disabled={saving}
          style={{ padding:"5px 14px", background:saving?"#555":"#000", color:"#fff", border:"none", borderRadius:6, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:N.font, transition:"background .15s" }}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 96px 100px" }}>
        {/* 이모지 + 제목 */}
        <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="제목 없음"
          style={{ width:"100%", fontSize:40, fontWeight:700, border:"none", outline:"none", color:N.text, marginBottom:8, padding:0, background:"transparent", boxSizing:"border-box", fontFamily:N.font, letterSpacing:"-0.02em" }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("editor-content")?.focus(); } }} />

        {/* 속성 */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:`1px solid ${N.border}` }}>
            <span style={{ fontSize:13, color:N.textMuted, width:80 }}>📁 카테고리</span>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              style={{ border:"none", outline:"none", fontSize:13, color:N.text, background:"transparent", cursor:"pointer", fontFamily:N.font }}>
              <option value="">없음</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${N.border}` }}>
            <span style={{ fontSize:13, color:N.textMuted, width:80 }}>🏷️ 태그</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {tags.map(t => (
                <button key={t.id} onClick={() => toggleTag(t.id)}
                  style={{ padding:"2px 10px", border:`1px solid ${selectedTags.includes(t.id) ? N.blue : N.border}`, borderRadius:4, fontSize:12, background: selectedTags.includes(t.id) ? N.blueBg : "transparent", color: selectedTags.includes(t.id) ? N.blue : N.textMuted, cursor:"pointer", fontFamily:N.font }}>
                  #{t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ borderTop:`1px solid ${N.border}`, marginBottom:24 }} />

        {/* 에디터 */}
        {tab === "write" ? (
          <textarea id="editor-content" value={content} onChange={e => setContent(e.target.value)}
            placeholder={"여기에 내용을 작성하세요\n\n마크다운 사용 가능:\n# 제목\n## 소제목\n**굵게** *기울임* `코드`\n- 목록\n> 인용"}
            style={{ width:"100%", minHeight:520, border:"none", outline:"none", fontSize:16, lineHeight:1.75, color:N.text, resize:"none", fontFamily:"'SF Mono', ui-monospace, monospace", background:"transparent", boxSizing:"border-box", padding:0 }} />
        ) : (
          <div style={{ minHeight:520, fontSize:16, lineHeight:1.75 }} className="notion-content"
            dangerouslySetInnerHTML={{ __html: md(content) || `<p style="color:${N.textMuted}">내용 없음</p>` }} />
        )}
      </div>

      <style>{`
        .notion-content { color:${N.text}; }
        .notion-content h1 { font-size:28px; font-weight:700; margin:32px 0 8px; }
        .notion-content h2 { font-size:22px; font-weight:600; margin:24px 0 6px; }
        .notion-content h3 { font-size:18px; font-weight:600; margin:20px 0 4px; }
        .notion-content p { margin:4px 0; }
        .notion-content ul { padding-left:20px; margin:4px 0; }
        .notion-content li { margin:2px 0; }
        .notion-content code { background:#f7f6f3; border-radius:3px; padding:2px 6px; font-size:14px; font-family:monospace; }
        .notion-content blockquote { border-left:3px solid ${N.border}; margin:8px 0; padding:4px 16px; color:${N.textMuted}; }
        .notion-content hr { border:none; border-top:1px solid ${N.border}; margin:20px 0; }
      `}</style>
    </div>
  );
}
