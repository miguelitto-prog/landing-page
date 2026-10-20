/* ===================================================================
   Comportamentos compartilhados do site
   - links para a pesquisa
   - aviso de privacidade/cookies
   - conteúdo vindo dos cadastros do painel (atrativos, hospedagem, eventos)
   =================================================================== */
(function () {
  var cfg = window.VASSOURAS_CONFIG || {};

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function linkSeguro(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function dataBR(iso) { return iso ? iso.split("-").reverse().join("/") : ""; }

  // Links da pesquisa ------------------------------------------------------
  if (cfg.pesquisaUrl) {
    document.querySelectorAll("[data-pesquisa]").forEach(function (a) {
      a.href = cfg.pesquisaUrl + (a.dataset.pesquisa ? "/?ponto=" + encodeURIComponent(a.dataset.pesquisa) : "");
    });
  }

  // Aviso de privacidade ---------------------------------------------------
  var CHAVE_AVISO = "vd_aviso_privacidade";
  var jaViu = false;
  try { jaViu = localStorage.getItem(CHAVE_AVISO) === "ok"; } catch (e) {}
  if (!jaViu) {
    var aviso = document.createElement("div");
    aviso.className = "aviso-cookies";
    aviso.setAttribute("role", "region");
    aviso.setAttribute("aria-label", "Aviso de privacidade");
    aviso.innerHTML =
      '<span>Este site não usa cookies de rastreamento nem publicidade. Fontes e imagens são carregadas de serviços externos. ' +
      '<a href="privacidade.html">Política de privacidade e cookies</a>.</span>' +
      '<button type="button">Entendi</button>';
    aviso.querySelector("button").addEventListener("click", function () {
      try { localStorage.setItem(CHAVE_AVISO, "ok"); } catch (e) {}
      aviso.remove();
    });
    document.body.appendChild(aviso);
  }

  // Conteúdo dinâmico ------------------------------------------------------
  var alvos = {
    atrativos: document.getElementById("dinamico-atrativos"),
    hospedagem: document.getElementById("dinamico-hospedagem"),
    eventos: document.getElementById("dinamico-eventos"),
  };
  if (!alvos.atrativos && !alvos.hospedagem && !alvos.eventos) return;
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return; // mantém a lista fixa

  fetch(cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/kv_store?key=eq.vd_cadastros&select=value", {
    headers: { apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + cfg.supabaseAnonKey },
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (linhas) {
      if (!linhas.length) return; // painel ainda não salvou cadastros
      var c = JSON.parse(linhas[0].value);
      var ativos = function (l) { return (l || []).filter(function (i) { return i.ativo !== false; }); };

      if (alvos.atrativos) {
        var lista = ativos(c.atrativos).filter(function (a) { return a.site; });
        if (lista.length) {
          alvos.atrativos.innerHTML = lista.map(function (a, i) {
            return '<div class="at-card"><span class="num">' + String(i + 1).padStart(2, "0") + "</span><h3>" +
              esc(a.nome) + "</h3>" + (a.descricao ? "<p>" + esc(a.descricao) + "</p>" : "") + "</div>";
          }).join("");
        }
      }

      if (alvos.hospedagem) {
        var hs = ativos(c.hospedagens).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
        if (hs.length) {
          alvos.hospedagem.innerHTML = hs.map(function (h) {
            var link = linkSeguro(h.link);
            var nome = link
              ? '<a class="nome" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(h.nome) + "</a>"
              : '<span class="nome">' + esc(h.nome) + "</span>";
            return '<div class="ledger-item">' + nome + '<span class="tag">' + esc(h.tipo || "") + "</span></div>";
          }).join("");
        }
      }

      if (alvos.eventos) {
        var hoje = new Date().toISOString().slice(0, 10);
        var evs = ativos(c.eventos)
          .filter(function (e) { return !(e.dataFim || e.dataInicio) || (e.dataFim || e.dataInicio) >= hoje; })
          .sort(function (a, b) { return String(a.dataInicio || "9999").localeCompare(String(b.dataInicio || "9999")); });
        if (evs.length) {
          alvos.eventos.querySelector(".eventos-lista").innerHTML = evs.map(function (e) {
            var datas = [dataBR(e.dataInicio), dataBR(e.dataFim)].filter(Boolean);
            if (datas.length === 2 && datas[0] === datas[1]) datas = [datas[0]];
            return '<div class="evento"><span class="data">' + (datas.join(" a ") || "Data a confirmar") +
              "</span><div><h3>" + esc(e.nome) + "</h3>" + (e.local ? "<p>" + esc(e.local) + "</p>" : "") + "</div></div>";
          }).join("");
          alvos.eventos.hidden = false;
        }
      }
    })
    .catch(function () { /* sem conexão: fica a lista fixa */ });
})();
