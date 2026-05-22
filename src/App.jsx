import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dhlkpkqlevmgdrlgdkui.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mFFtiFeBffanC2Tq2-7Vqg_MmqXQPiW";
const SITE_PASSWORD = "0909";


const MEMBERS = ["가희","유정","동혁","강민","지용","호준","세환"];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Notion 다크 팔레트 ──────────────────────────────────
const N = {
  bg:        "#191919",
  sidebar:   "#202020",
  card:      "#252525",
  hover:     "#2f2f2f",
  active:    "#37352f33",
  border:    "#363636",
  text:      "#e6e6e5",
  textMuted: "#9b9b9b",
  textLight: "#5e5e5e",
  blue:      "#2383e2",
  blueBg:    "#1e3a5f",
  red:       "#e03e3e",
  tag:       "#2f2f2f",
  tagText:   "#a0a0a0",
  font:      "'Segoe UI', ui-sans-serif, -apple-system, sans-serif",
};

function md(text) {
  if (!text) return "";
  return text
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`(.+?)`/g,"<code>$1</code>")
    .replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^---$/gm,"<hr>")
    .replace(/^- (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g,"<ul>$&</ul>")
    .split("\n\n").map(p=>p.startsWith("<")?p:`<p>${p}</p>`).join("");
}

// ── 비밀번호 화면 ────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  const submit=e=>{
    e.preventDefault();
    if(pw===SITE_PASSWORD){sessionStorage.setItem("wauth","1");onUnlock();}
    else{setErr(true);setPw("");setTimeout(()=>setErr(false),1500);}
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:N.bg,fontFamily:N.font}}>
      <div style={{width:300,textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:12,background:N.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 20px"}}>🔒</div>
        <h2 style={{fontSize:20,fontWeight:700,color:N.text,margin:"0 0 6px"}}>팀 위키</h2>
        <p style={{fontSize:14,color:N.textMuted,margin:"0 0 24px"}}>비밀번호를 입력하세요</p>
        <form onSubmit={submit}>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="비밀번호" autoFocus
            style={{width:"100%",padding:"8px 12px",border:`1px solid ${err?N.red:N.border}`,borderRadius:6,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:8,color:N.text,background:N.card,fontFamily:N.font}}/>
          {err&&<p style={{color:N.red,fontSize:13,margin:"0 0 8px"}}>비밀번호가 틀렸습니다</p>}
          <button type="submit" style={{width:"100%",padding:"8px",background:N.blue,color:"#fff",border:"none",borderRadius:6,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:N.font}}>입장하기</button>
        </form>
      </div>
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────
export default function App() {
  const [authed,setAuthed]=useState(()=>sessionStorage.getItem("wauth")==="1");
  const [view,setView]=useState("list");
  const [articles,setArticles]=useState([]);
  const [categories,setCategories]=useState([]);
  const [tags,setTags]=useState([]);
  const [selected,setSelected]=useState(null);
  const [filterCat,setFilterCat]=useState(null);
  const [filterTag,setFilterTag]=useState(null);
  const [filterMember,setFilterMember]=useState(null);
  const [search,setSearch]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const [loading,setLoading]=useState(false);

  const fetchAll=useCallback(async()=>{
    setLoading(true);
    const [{data:arts},{data:cats},{data:tgs}]=await Promise.all([
      supabase.from("articles").select("*, categories(name), article_tags(tag_id, tags(name))").order("updated_at",{ascending:false}),
      supabase.from("categories").select("*").order("name"),
      supabase.from("tags").select("*").order("name"),
    ]);
    setArticles(arts||[]); setCategories(cats||[]); setTags(tgs||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{if(authed)fetchAll();},[authed,fetchAll]);

  if(!authed) return <PasswordGate onUnlock={()=>setAuthed(true)}/>;

  const filtered=articles.filter(a=>{
    if(filterCat&&a.category_id!==filterCat) return false;
    if(filterTag&&!a.article_tags?.some(at=>at.tag_id===filterTag)) return false;
    if(filterMember&&a.member!==filterMember) return false;
    if(search){const q=search.toLowerCase();return a.title.toLowerCase().includes(q)||a.content.toLowerCase().includes(q);}
    return true;
  });

  const pageTitle=filterMember?`👤 ${filterMember}`
    :filterCat?categories.find(c=>c.id===filterCat)?.name
    :filterTag?`# ${tags.find(t=>t.id===filterTag)?.name}`
    :"모든 페이지";

  const goList=()=>{setView("list");setSelected(null);};

  if(view==="detail"&&selected) return(
    <Layout {...{categories,tags,filterCat,filterTag,filterMember,setFilterCat,setFilterTag,setFilterMember,searchOpen,setSearchOpen,search,setSearch,fetchAll}}
      onNew={()=>{setSelected(null);setView("edit");}}>
      <DetailView article={selected} onBack={goList} onEdit={()=>setView("edit")}
        onDelete={async()=>{await supabase.from("articles").delete().eq("id",selected.id);goList();fetchAll();}}/>
    </Layout>
  );

  if(view==="edit") return(
    <Layout {...{categories,tags,filterCat,filterTag,filterMember,setFilterCat,setFilterTag,setFilterMember,searchOpen,setSearchOpen,search,setSearch,fetchAll}}
      onNew={()=>{setSelected(null);setView("edit");}}>
      <EditView article={selected} categories={categories} tags={tags}
        onSave={async data=>{
          let id=selected?.id;
          if(id) await supabase.from("articles").update({title:data.title,content:data.content,category_id:data.categoryId,member:data.member||null}).eq("id",id);
          else{const{data:c}=await supabase.from("articles").insert({title:data.title,content:data.content,category_id:data.categoryId,member:data.member||null}).select().single();id=c.id;}
          await supabase.from("article_tags").delete().eq("article_id",id);
          if(data.tagIds.length) await supabase.from("article_tags").insert(data.tagIds.map(tid=>({article_id:id,tag_id:tid})));
          await fetchAll();goList();
        }}
        onCancel={()=>setView(selected?"detail":"list")}/>
    </Layout>
  );

  return(
    <Layout {...{categories,tags,filterCat,filterTag,filterMember,setFilterCat,setFilterTag,setFilterMember,searchOpen,setSearchOpen,search,setSearch,fetchAll}}
      onNew={()=>{setSelected(null);setView("edit");}}>
      <div style={{padding:"32px 40px",fontFamily:N.font}}>
        <div style={{background:N.card,borderRadius:8,border:`1px solid ${N.border}`,padding:"32px 40px"}}>
          <h1 style={{fontSize:32,fontWeight:700,color:N.text,margin:"0 0 4px",letterSpacing:"-0.02em"}}>{pageTitle}</h1>
          <p style={{fontSize:13,color:N.textMuted,margin:"0 0 28px"}}>{filtered.length}개의 페이지</p>
          {loading?(<p style={{color:N.textMuted,fontSize:14}}>불러오는 중...</p>)
          :filtered.length===0?(<EmptyState onNew={()=>{setSelected(null);setView("edit");}}/>)
          :(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 80px",padding:"0 8px 8px",borderBottom:`1px solid ${N.border}`,marginBottom:4}}>
                {["제목","카테고리","작성자","수정일"].map(h=>(
                  <span key={h} style={{fontSize:12,color:N.textMuted,fontWeight:500,textAlign:h==="제목"?"left":"right"}}>{h}</span>
                ))}
              </div>
              {filtered.map(a=><ArticleRow key={a.id} article={a} onClick={()=>{setSelected(a);setView("detail");}}/>)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── 레이아웃 + 사이드바 ───────────────────────────────────
function Layout({children,categories,tags,filterCat,filterTag,filterMember,setFilterCat,setFilterTag,setFilterMember,searchOpen,setSearchOpen,search,setSearch,fetchAll,onNew}){
  const [catOpen,setCatOpen]=useState(true);
  const [tagOpen,setTagOpen]=useState(true);
  const [memberOpen,setMemberOpen]=useState(true);
  const [newCat,setNewCat]=useState(""); const [addingCat,setAddingCat]=useState(false);
  const [newTag,setNewTag]=useState(""); const [addingTag,setAddingTag]=useState(false);
  const catInputRef=useRef(null); const tagInputRef=useRef(null);

  useEffect(()=>{if(addingCat) catInputRef.current?.focus();},[addingCat]);
  useEffect(()=>{if(addingTag) tagInputRef.current?.focus();},[addingTag]);

  const addCategory=async()=>{
    if(!newCat.trim()) return setAddingCat(false);
    await supabase.from("categories").insert({name:newCat.trim()});
    setNewCat(""); setAddingCat(false); fetchAll();
  };
  const delCategory=async(id,e)=>{
    e.stopPropagation();
    if(!confirm("카테고리를 삭제할까요?")) return;
    await supabase.from("categories").delete().eq("id",id);
    if(filterCat===id) setFilterCat(null);
    fetchAll();
  };
  const addTag=async()=>{
    if(!newTag.trim()) return setAddingTag(false);
    await supabase.from("tags").insert({name:newTag.trim()});
    setNewTag(""); setAddingTag(false); fetchAll();
  };
  const delTag=async(id,e)=>{
    e.stopPropagation();
    if(!confirm("태그를 삭제할까요?")) return;
    await supabase.from("tags").delete().eq("id",id);
    if(filterTag===id) setFilterTag(null);
    fetchAll();
  };

  return(
    <div style={{display:"flex",minHeight:"100vh",fontFamily:N.font,background:N.bg}}>
      {/* 사이드바 */}
      <aside style={{width:240,minHeight:"100vh",background:N.sidebar,display:"flex",flexDirection:"column",flexShrink:0,borderRight:`1px solid ${N.border}`}}>
        <div style={{padding:"14px 10px 8px"}}>
          {/* 워크스페이스 */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",marginBottom:4}}>
            <span style={{fontSize:18}}>📚</span>
            <span style={{fontSize:14,fontWeight:600,color:N.text}}>팀 위키</span>
          </div>
          {/* 검색 */}
          <NavBtn onClick={()=>setSearchOpen(p=>!p)} style={{color:N.textMuted,fontSize:13}}>
            <SideIcon>🔍</SideIcon>검색
          </NavBtn>
          {searchOpen&&(
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="검색어 입력..." autoFocus
              style={{width:"100%",marginTop:4,padding:"6px 10px",border:`1px solid ${N.border}`,borderRadius:6,fontSize:13,outline:"none",background:N.card,color:N.text,fontFamily:N.font,boxSizing:"border-box"}}/>
          )}
          {/* 새 페이지 */}
          <NavBtn onClick={onNew} style={{color:N.textMuted,fontSize:13}}>
            <SideIcon>✏️</SideIcon>새 페이지
          </NavBtn>
          <div style={{height:1,background:N.border,margin:"8px 2px"}}/>
          {/* 모든 페이지 */}
          <NavBtn onClick={()=>{setFilterCat(null);setFilterTag(null);setFilterMember(null);}} active={!filterCat&&!filterTag&&!filterMember}>
            <SideIcon>🏠</SideIcon><span style={{fontSize:13}}>모든 페이지</span>
          </NavBtn>
        </div>

        {/* 카테고리 */}
        <SideSection label="카테고리" open={catOpen} setOpen={setCatOpen} onAdd={()=>setAddingCat(true)}>
          {categories.map(c=>(
            <NavBtnDel key={c.id} active={filterCat===c.id} onClick={()=>{setFilterCat(c.id);setFilterTag(null);setFilterMember(null);}} onDel={e=>delCategory(c.id,e)}>
              <SideIcon>📁</SideIcon><span style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
            </NavBtnDel>
          ))}
          {addingCat&&(
            <div style={{padding:"2px 8px"}}>
              <input ref={catInputRef} value={newCat} onChange={e=>setNewCat(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addCategory();if(e.key==="Escape")setAddingCat(false);}}
                onBlur={addCategory} placeholder="카테고리 이름..."
                style={{width:"100%",padding:"4px 8px",background:N.card,border:`1px solid ${N.blue}`,borderRadius:4,color:N.text,fontSize:13,outline:"none",fontFamily:N.font,boxSizing:"border-box"}}/>
            </div>
          )}
        </SideSection>

        {/* 태그 */}
        <SideSection label="태그" open={tagOpen} setOpen={setTagOpen} onAdd={()=>setAddingTag(true)}>
          {tags.map(t=>(
            <NavBtnDel key={t.id} active={filterTag===t.id} onClick={()=>{setFilterTag(t.id);setFilterCat(null);setFilterMember(null);}} onDel={e=>delTag(t.id,e)}>
              <SideIcon style={{fontSize:12}}>#</SideIcon><span style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
            </NavBtnDel>
          ))}
          {addingTag&&(
            <div style={{padding:"2px 8px"}}>
              <input ref={tagInputRef} value={newTag} onChange={e=>setNewTag(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addTag();if(e.key==="Escape")setAddingTag(false);}}
                onBlur={addTag} placeholder="태그 이름..."
                style={{width:"100%",padding:"4px 8px",background:N.card,border:`1px solid ${N.blue}`,borderRadius:4,color:N.text,fontSize:13,outline:"none",fontFamily:N.font,boxSizing:"border-box"}}/>
            </div>
          )}
        </SideSection>

        {/* 팀원 */}
        <SideSection label="팀원" open={memberOpen} setOpen={setMemberOpen}>
          {MEMBERS.map(m=>(
            <NavBtn key={m} active={filterMember===m} onClick={()=>{setFilterMember(filterMember===m?null:m);setFilterCat(null);setFilterTag(null);}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:memberColor(m),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#fff",flexShrink:0}}>{m[0]}</div>
              <span style={{fontSize:13}}>{m}</span>
            </NavBtn>
          ))}
        </SideSection>

        <div style={{flex:1}}/>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${N.border}`}}>
          <p style={{fontSize:11,color:N.textLight,margin:0}}>팀 위키 · {MEMBERS.length}명</p>
        </div>
      </aside>

      {/* 메인 */}
      <main style={{flex:1,overflow:"auto"}}>{children}</main>
    </div>
  );
}

function SideSection({label,open,setOpen,onAdd,children}){
  const [hov,setHov]=useState(false);
  return(
    <div style={{padding:"8px 10px 2px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 6px",marginBottom:2}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <button onClick={()=>setOpen(p=>!p)}
          style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:N.textMuted,fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",padding:0,fontFamily:N.font}}>
          <span style={{display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",transition:".15s",fontSize:9}}>▶</span>{label}
        </button>
        {onAdd&&hov&&(
          <button onClick={onAdd} style={{background:"none",border:"none",cursor:"pointer",color:N.textMuted,fontSize:16,padding:"0 2px",lineHeight:1,fontFamily:N.font}}>+</button>
        )}
      </div>
      {open&&children}
    </div>
  );
}

function NavBtn({children,onClick,active,style={}}){
  const [hov,setHov]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 8px",border:"none",borderRadius:4,cursor:"pointer",textAlign:"left",fontFamily:N.font,color:active?N.text:N.textMuted,background:active?N.hover:hov?N.hover:"transparent",...style}}>
      {children}
    </button>
  );
}

function NavBtnDel({children,onClick,active,onDel}){
  const [hov,setHov]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 8px",border:"none",borderRadius:4,cursor:"pointer",textAlign:"left",fontFamily:N.font,color:active?N.text:N.textMuted,background:active?N.hover:hov?N.hover:"transparent",position:"relative"}}>
      {children}
      {hov&&<span onClick={onDel} style={{marginLeft:"auto",fontSize:12,color:N.textLight,padding:"0 2px",cursor:"pointer",flexShrink:0}} title="삭제">✕</span>}
    </button>
  );
}

function SideIcon({children,style={}}){
  return <span style={{fontSize:14,width:18,textAlign:"center",flexShrink:0,...style}}>{children}</span>;
}

const memberColors=["#e8534a","#e2883a","#2383e2","#0f9d58","#9c27b0","#00bcd4","#ff5722"];
function memberColor(name){return memberColors[MEMBERS.indexOf(name)%memberColors.length]||"#888";}

function ArticleRow({article:a,onClick}){
  const [hov,setHov]=useState(false);
  const tags=a.article_tags?.map(at=>at.tags?.name).filter(Boolean)||[];
  const date=new Date(a.updated_at).toLocaleDateString("ko-KR",{month:"short",day:"numeric"});
  return(
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 80px",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:4,cursor:"pointer",background:hov?N.hover:"transparent",transition:"background .1s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        <span style={{fontSize:15,flexShrink:0}}>📄</span>
        <span style={{fontSize:14,fontWeight:500,color:N.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</span>
        {tags.slice(0,2).map(t=><span key={t} style={{fontSize:11,background:N.tag,color:N.tagText,borderRadius:3,padding:"1px 6px",flexShrink:0}}>#{t}</span>)}
      </div>
      <span style={{fontSize:12,color:N.textMuted,textAlign:"right",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.categories?.name||"—"}</span>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        {a.member?(
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:memberColor(a.member),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,color:"#fff"}}>{a.member[0]}</div>
            <span style={{fontSize:12,color:N.textMuted}}>{a.member}</span>
          </div>
        ):<span style={{fontSize:12,color:N.textLight}}>—</span>}
      </div>
      <span style={{fontSize:12,color:N.textLight,textAlign:"right"}}>{date}</span>
    </div>
  );
}

function EmptyState({onNew}){
  return(
    <div style={{textAlign:"center",padding:"60px 0"}}>
      <p style={{fontSize:40,margin:"0 0 10px"}}>📭</p>
      <p style={{fontSize:15,fontWeight:500,color:N.text,margin:"0 0 6px"}}>페이지가 없습니다</p>
      <p style={{fontSize:13,color:N.textMuted,margin:"0 0 20px"}}>새 페이지를 만들어 시작하세요</p>
      <button onClick={onNew} style={{padding:"7px 18px",background:N.blue,color:"#fff",border:"none",borderRadius:6,fontSize:13,cursor:"pointer",fontFamily:N.font}}>+ 새 페이지</button>
    </div>
  );
}

function TopBtn({children,onClick,danger}){
  const [hov,setHov]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"4px 10px",border:"none",borderRadius:4,background:hov?N.hover:"transparent",color:danger?N.red:N.textMuted,fontSize:13,cursor:"pointer",fontFamily:N.font}}>
      {children}
    </button>
  );
}

function DetailView({article:a,onBack,onEdit,onDelete}){
  const tags=a.article_tags?.map(at=>at.tags?.name).filter(Boolean)||[];
  const date=new Date(a.updated_at).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"});
  return(
    <div style={{fontFamily:N.font,minHeight:"100vh",background:N.bg}}>
      <div style={{height:44,display:"flex",alignItems:"center",padding:"0 16px",gap:4,borderBottom:`1px solid ${N.border}`,background:N.sidebar}}>
        <TopBtn onClick={onBack}>← 뒤로</TopBtn>
        <div style={{flex:1}}/>
        <TopBtn onClick={onEdit}>편집</TopBtn>
        <TopBtn onClick={()=>{if(confirm("정말 삭제할까요?"))onDelete();}} danger>삭제</TopBtn>
      </div>
      <div style={{maxWidth:760,margin:"32px auto",background:N.card,borderRadius:8,border:`1px solid ${N.border}`,padding:"60px 80px 100px"}}>
        <h1 style={{fontSize:38,fontWeight:700,color:N.text,margin:"0 0 16px",lineHeight:1.2,letterSpacing:"-0.02em"}}>{a.title}</h1>
        <div style={{marginBottom:28}}>
          <PropRow icon="🗓️" label="수정일" value={date}/>
          {a.categories?.name&&<PropRow icon="📁" label="카테고리" value={a.categories.name}/>}
          {a.member&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${N.border}`}}>
              <span style={{fontSize:13,color:N.textMuted,width:80}}>👤 작성자</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:memberColor(a.member),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#fff"}}>{a.member[0]}</div>
                <span style={{fontSize:13,color:N.text}}>{a.member}</span>
              </div>
            </div>
          )}
          {tags.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${N.border}`}}>
              <span style={{fontSize:13,color:N.textMuted,width:80}}>🏷️ 태그</span>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {tags.map(t=><span key={t} style={{fontSize:12,background:N.tag,color:N.tagText,borderRadius:3,padding:"2px 8px"}}>#{t}</span>)}
              </div>
            </div>
          )}
        </div>
        <div style={{borderTop:`1px solid ${N.border}`,paddingTop:28}}>
          <div className="nc" dangerouslySetInnerHTML={{__html:md(a.content)}}/>
        </div>
      </div>
      <style>{ncStyle()}</style>
    </div>
  );
}

function PropRow({icon,label,value}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${N.border}`}}>
      <span style={{fontSize:13,color:N.textMuted,width:80}}>{icon} {label}</span>
      <span style={{fontSize:13,color:N.text}}>{value}</span>
    </div>
  );
}

function EditView({article,categories,tags,onSave,onCancel}){
  const [title,setTitle]=useState(article?.title||"");
  const [content,setContent]=useState(article?.content||"");
  const [categoryId,setCategoryId]=useState(article?.category_id||"");
  const [member,setMember]=useState(article?.member||"");
  const [selectedTags,setSelectedTags]=useState(article?.article_tags?.map(at=>at.tag_id)||[]);
  const [tab,setTab]=useState("write");
  const [saving,setSaving]=useState(false);
  const titleRef=useRef(null);
  useEffect(()=>{titleRef.current?.focus();},[]);
  const toggleTag=id=>setSelectedTags(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const save=async()=>{
    if(!title.trim()){titleRef.current?.focus();return;}
    setSaving(true);
    await onSave({title,content,categoryId:categoryId||null,member,tagIds:selectedTags});
    setSaving(false);
  };
  return(
    <div style={{fontFamily:N.font,minHeight:"100vh",background:N.bg}}>
      <div style={{height:44,display:"flex",alignItems:"center",padding:"0 16px",gap:4,borderBottom:`1px solid ${N.border}`,background:N.sidebar}}>
        <TopBtn onClick={onCancel}>← 취소</TopBtn>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:0}}>
          {["write","preview"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:"4px 12px",border:"none",borderRadius:4,background:"transparent",color:tab===t?N.text:N.textMuted,fontSize:13,cursor:"pointer",fontFamily:N.font,fontWeight:tab===t?500:400}}>
              {t==="write"?"작성":"미리보기"}
            </button>
          ))}
        </div>
        <div style={{width:1,height:18,background:N.border,margin:"0 4px"}}/>
        <button onClick={save} disabled={saving}
          style={{padding:"5px 14px",background:saving?"#555":N.blue,color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:N.font}}>
          {saving?"저장 중...":"저장"}
        </button>
      </div>
      <div style={{maxWidth:760,margin:"32px auto",background:N.card,borderRadius:8,border:`1px solid ${N.border}`,padding:"48px 80px 100px"}}>
        <input ref={titleRef} value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목 없음"
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();document.getElementById("ec")?.focus();}}}
          style={{width:"100%",fontSize:38,fontWeight:700,border:"none",outline:"none",color:N.text,marginBottom:12,padding:0,background:"transparent",boxSizing:"border-box",fontFamily:N.font,letterSpacing:"-0.02em"}}/>
        {/* 속성 */}
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${N.border}`}}>
            <span style={{fontSize:13,color:N.textMuted,width:80}}>📁 카테고리</span>
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)}
              style={{border:"none",outline:"none",fontSize:13,color:N.text,background:"transparent",cursor:"pointer",fontFamily:N.font}}>
              <option value="">없음</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${N.border}`}}>
            <span style={{fontSize:13,color:N.textMuted,width:80}}>👤 작성자</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {MEMBERS.map(m=>(
                <button key={m} onClick={()=>setMember(member===m?"":m)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",border:`1px solid ${member===m?memberColor(m):N.border}`,borderRadius:20,fontSize:12,background:member===m?memberColor(m)+"22":"transparent",color:member===m?memberColor(m):N.textMuted,cursor:"pointer",fontFamily:N.font}}>
                  <div style={{width:14,height:14,borderRadius:"50%",background:memberColor(m),flexShrink:0}}/>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${N.border}`}}>
            <span style={{fontSize:13,color:N.textMuted,width:80}}>🏷️ 태그</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {tags.map(t=>(
                <button key={t.id} onClick={()=>toggleTag(t.id)}
                  style={{padding:"2px 10px",border:`1px solid ${selectedTags.includes(t.id)?N.blue:N.border}`,borderRadius:4,fontSize:12,background:selectedTags.includes(t.id)?N.blueBg:"transparent",color:selectedTags.includes(t.id)?N.blue:N.textMuted,cursor:"pointer",fontFamily:N.font}}>
                  #{t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${N.border}`,marginBottom:24}}/>
        {tab==="write"?(
          <textarea id="ec" value={content} onChange={e=>setContent(e.target.value)}
            placeholder={"여기에 내용을 작성하세요\n\n# 제목\n## 소제목\n**굵게** *기울임* `코드`\n- 목록\n> 인용"}
            style={{width:"100%",minHeight:520,border:"none",outline:"none",fontSize:16,lineHeight:1.8,color:N.text,resize:"none",fontFamily:N.font,background:"transparent",boxSizing:"border-box",padding:0}}/>
        ):(
          <div style={{minHeight:520,fontSize:16,lineHeight:1.8}} className="nc"
            dangerouslySetInnerHTML={{__html:md(content)||`<p style="color:${N.textMuted}">내용 없음</p>`}}/>
        )}
      </div>
      <style>{ncStyle()}</style>
    </div>
  );
}

function ncStyle(){
  return `
    .nc{color:${N.text};font-family:${N.font};}
    .nc h1{font-size:28px;font-weight:700;margin:32px 0 8px;color:${N.text};}
    .nc h2{font-size:22px;font-weight:600;margin:24px 0 6px;color:${N.text};}
    .nc h3{font-size:18px;font-weight:600;margin:20px 0 4px;color:${N.text};}
    .nc p{margin:4px 0;color:${N.text};}
    .nc ul{padding-left:20px;margin:4px 0;}
    .nc li{margin:3px 0;color:${N.text};}
    .nc code{background:${N.tag};border-radius:3px;padding:2px 6px;font-size:14px;font-family:monospace;color:#e6c07b;}
    .nc blockquote{border-left:3px solid ${N.border};margin:8px 0;padding:4px 16px;color:${N.textMuted};}
    .nc hr{border:none;border-top:1px solid ${N.border};margin:20px 0;}
    .nc strong{font-weight:600;color:${N.text};}
  `;
}
