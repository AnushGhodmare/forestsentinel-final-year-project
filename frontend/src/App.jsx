import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const API_URL = "http://127.0.0.1:8000";

// ---------------- GLOBAL THEME ----------------
function GlobalTheme() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

      html, body, #root {
        margin: 0; padding: 0; width: 100%; height: 100%;
        overflow: hidden;
      }
      #root {
        max-width: none !important;
        text-align: left !important;
      }
      * { box-sizing: border-box; }

      :root {
        --bg: #F4EEDF;
        --surface: #FFFCF4;
        --border: #DCD0AC;
        --text: #221D14;
        --text-muted: #766B4F;
        --accent: #2E7D46;
        --accent-dark: #1F5C34;
        --accent-soft: #DCEEDD;
        --black: #1B1710;
        --line: #C9BE97;
        --card-shadow: 0 2px 0 rgba(34,29,20,0.08);
      }
      :root[data-theme="light"] {
        --bg: #F4EEDF;
        --surface: #FFFCF4;
        --border: #DCD0AC;
        --text: #221D14;
        --text-muted: #766B4F;
        --accent: #2E7D46;
        --accent-dark: #1F5C34;
        --accent-soft: #DCEEDD;
        --black: #1B1710;
        --line: #C9BE97;
        --card-shadow: 0 2px 0 rgba(34,29,20,0.08);
      }
      :root[data-theme="dark"] {
        --bg: #0E0F0B;
        --surface: #16180F;
        --border: #2C2F1F;
        --text: #E9E4CE;
        --text-muted: #8C9270;
        --accent: #3FAE66;
        --accent-dark: #2E7D46;
        --accent-soft: #17281C;
        --black: #050603;
        --line: #23261A;
        --card-shadow: 0 2px 0 rgba(0,0,0,0.5);
      }

      body {
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 400;
        background:
          radial-gradient(ellipse at 15% 0%, rgba(201,84,27,0.10), transparent 55%),
          repeating-linear-gradient(0deg, transparent 0px, transparent 31px, var(--line) 31px, var(--line) 32px),
          var(--bg);
        background-attachment: fixed;
      }

      @keyframes riseIn {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scanSweep {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
      }

      .stripe-bar {
        height: 3px; width: 100%;
        background: repeating-linear-gradient(
          -45deg, var(--black) 0px, var(--black) 8px,
          var(--accent) 8px, var(--accent) 16px
        );
      }

      .app-shell {
        position: fixed; inset: 0; width: 100%; height: 100%;
        display: flex; background: var(--bg); color: var(--text); overflow: hidden;
      }

      /* Collapsible sidebar: a 64px rail that expands over the page on hover/tap */
      .sidebar-slot { width: 64px; min-width: 64px; height: 100%; position: relative; flex-shrink: 0; z-index: 60; }
      .sidebar-backdrop {
        position: fixed; inset: 0; background: rgba(5,6,3,0.45); z-index: 55;
        animation: fadeIn 0.2s ease both;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .sidebar {
        position: absolute; top: 0; left: 0; height: 100%;
        width: 64px; background: var(--black); color: var(--text);
        display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto;
        border-right: 1px solid var(--line);
        transition: width 0.22s ease, box-shadow 0.22s ease;
      }
      .sidebar.open { width: 248px; box-shadow: 8px 0 28px rgba(0,0,0,0.4); }
      .sidebar-head { display: flex; align-items: center; gap: 14px; padding: 18px 0 16px 11px; min-height: 76px; }
      .sidebar-toggle {
        width: 40px; height: 40px; flex-shrink: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: transparent; color: var(--accent); border: 1px solid var(--line);
        font-family: 'IBM Plex Mono', monospace; font-size: 18px; line-height: 1;
      }
      .sidebar-toggle:hover { background: var(--accent); color: var(--black); }
      .sidebar-brand { white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
      .sidebar.open .sidebar-brand { opacity: 1; pointer-events: auto; transition-delay: 0.08s; }
      .sidebar-brand h2 {
        font-family: 'Fraunces', serif; font-optical-sizing: auto;
        font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin: 0;
        color: #F4EEDF;
      }
      .sidebar-brand h2 span { color: var(--accent); font-style: italic; }
      .sidebar-brand p {
        font-family: 'IBM Plex Mono', monospace; font-weight: 500;
        margin: 4px 0 0 0; font-size: 9.5px; letter-spacing: 1.5px;
        text-transform: uppercase; color: #8C9270;
      }

      .sidebar-nav { flex: 1; padding: 6px 0; }
      .sidebar-item {
        font-family: 'IBM Plex Mono', monospace;
        display: flex; align-items: baseline; gap: 12px; white-space: nowrap;
        padding: 11px 0 11px 22px; cursor: pointer; font-weight: 500; font-size: 12.5px;
        letter-spacing: 0.6px; text-transform: uppercase;
        color: #8C9270; border-left: 2px solid transparent;
        transition: color 0.15s ease, background 0.15s ease;
      }
      .sidebar-item .idx { font-size: 10.5px; opacity: 0.75; min-width: 18px; }
      .sidebar-item .label { opacity: 0; transition: opacity 0.12s ease; }
      .sidebar.open .sidebar-item .label { opacity: 1; transition-delay: 0.08s; }
      .sidebar-item:hover { color: #F4EEDF; background: rgba(232,128,26,0.08); }
      .sidebar-item.active {
        color: var(--accent); border-left: 2px solid var(--accent);
        background: rgba(232,128,26,0.1); font-weight: 600;
      }

      .sidebar-footer { padding: 16px 10px 22px 10px; border-top: 1px solid var(--line); }
      .theme-toggle {
        font-family: 'IBM Plex Mono', monospace;
        display: flex; align-items: center; justify-content: space-between;
        padding: 9px 12px; border: 1px solid var(--line); margin-bottom: 10px;
        font-size: 10.5px; letter-spacing: 0.8px; text-transform: uppercase; color: #8C9270;
      }
      .theme-toggle button {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        background: transparent; color: var(--accent); border: 1px solid var(--accent);
        padding: 4px 10px; font-size: 10.5px; letter-spacing: 0.8px; cursor: pointer;
      }
      .theme-toggle button:hover { background: var(--accent); color: var(--black); }
      .sidebar-logout {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        padding: 10px 0; text-align: center; border: 1px solid #6B241A; white-space: nowrap;
        cursor: pointer; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
        color: #D9714C;
      }
      .sidebar-logout:hover { background: #6B241A; color: #F4EEDF; }

      .main-area { flex: 1; height: 100%; overflow-y: auto; padding: 38px 44px; position: relative; }

      .page-title {
        font-family: 'Fraunces', serif; font-optical-sizing: auto;
        font-size: 34px; font-weight: 900; letter-spacing: -0.6px; margin-bottom: 3px;
        color: var(--text);
        animation: riseIn 0.5s ease both;
      }
      .page-sub {
        font-family: 'IBM Plex Mono', monospace; font-weight: 500;
        color: var(--text-muted); font-size: 11.5px; letter-spacing: 0.5px;
        text-transform: uppercase; margin-bottom: 28px;
        animation: riseIn 0.5s ease 0.05s both;
      }

      .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-bottom: 30px; background: var(--border); border: 1px solid var(--border); }
      .stat-card {
        background: var(--surface); padding: 22px 20px 18px 20px; position: relative;
        animation: riseIn 0.5s ease both;
      }
      .stat-card:nth-child(1) { animation-delay: 0.08s; }
      .stat-card:nth-child(2) { animation-delay: 0.15s; }
      .stat-card:nth-child(3) { animation-delay: 0.22s; }
      .stat-card:nth-child(4) { animation-delay: 0.29s; }
      .stat-card::before {
        content: ""; position: absolute; top: 0; left: 0; width: 22px; height: 2px; background: var(--accent);
      }
      .stat-number { font-family: 'Fraunces', serif; font-weight: 900; font-size: 34px; color: var(--text); line-height: 1; }
      .stat-label {
        font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--text-muted); font-weight: 500;
        margin-top: 10px; text-transform: uppercase; letter-spacing: 1.2px;
      }
      .stat-card.accent .stat-number { color: var(--accent); }

      .panel {
        background: var(--surface); padding: 24px 26px;
        border: 1px solid var(--border); margin-bottom: 22px;
        animation: riseIn 0.5s ease 0.1s both;
      }
      .panel h3 {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 12px;
        margin: 0 0 18px 0; color: var(--text); text-transform: uppercase; letter-spacing: 1px;
      }
      .panel h3::before { content: "// "; color: var(--accent); }

      .jungle-table { width: 100%; border-collapse: collapse; }
      .jungle-table th {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
        color: var(--text-muted); padding: 10px 13px; border-bottom: 1px solid var(--border);
      }
      .jungle-table td {
        font-family: 'IBM Plex Mono', monospace; font-weight: 400;
        padding: 13px; border-bottom: 1px solid var(--border); font-size: 14.5px; color: var(--text);
      }
      .jungle-table tr:hover td { background: var(--accent-soft); }

      .view-btn {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        background: transparent; color: var(--accent-dark); border: 1px solid var(--accent);
        padding: 6px 13px; font-size: 11px; letter-spacing: 0.4px; cursor: pointer;
      }
      .view-btn:hover { background: var(--accent); color: var(--surface); }
      :root[data-theme="dark"] .view-btn { color: var(--accent); }
      :root[data-theme="dark"] .view-btn:hover { color: var(--black); }

      .gmaps-link {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        display: inline-flex; align-items: center; gap: 5px;
        background: var(--black); color: #F4EEDF; border: 1px solid var(--black);
        padding: 6px 13px; font-size: 11px; letter-spacing: 0.4px;
        text-decoration: none; cursor: pointer;
      }
      .gmaps-link:hover { background: var(--accent); border-color: var(--accent); color: var(--black); }

      .zone-badge {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        display: inline-block; padding: 3px 9px;
        font-size: 10px; color: #F4EEDF; letter-spacing: 0.6px; text-transform: uppercase;
      }

      .pan-control {
        position: absolute; bottom: 26px; left: 26px; z-index: 400;
        width: 108px; height: 108px;
        display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
        gap: 3px;
      }
      .pan-btn {
        font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 700;
        background: rgba(20,18,14,0.82); color: #F4EEDF; border: 1px solid rgba(244,238,228,0.25);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .pan-btn:hover { background: var(--accent); color: var(--black); }
      .pan-up { grid-column: 2; grid-row: 1; }
      .pan-left { grid-column: 1; grid-row: 2; }
      .pan-right { grid-column: 3; grid-row: 2; }
      .pan-down { grid-column: 2; grid-row: 3; }

      .cam-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); }
      .cam-card { background: var(--surface); overflow: hidden; }
      .cam-card-head {
        font-family: 'IBM Plex Mono', monospace;
        background: var(--black); color: var(--accent); padding: 24px 0; text-align: center;
        font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
      }
      .cam-card-body { padding: 16px; }

      .modal-backdrop {
        position: fixed; inset: 0; background: rgba(5,6,3,0.88);
        display: flex; align-items: center; justify-content: center; z-index: 100;
      }
      .modal-box {
        background: var(--surface); padding: 18px;
        border: 1px solid var(--accent); max-width: 90vw; max-height: 90vh;
        display: flex; flex-direction: column; gap: 10px;
      }
      .modal-box img { max-width: 70vw; max-height: 70vh; }
      .modal-close {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        align-self: flex-end; background: var(--black); color: #F4EEDF; border: none;
        padding: 6px 14px; font-size: 11px; letter-spacing: 0.6px; cursor: pointer;
      }
      .modal-close:hover { background: var(--accent); color: var(--black); }

      .login-wrapper {
        position: fixed; inset: 0; width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        background:
          linear-gradient(180deg, rgba(5,6,3,0.45), rgba(5,6,3,0.65)),
          url('/login-bg.jpg') center center / cover no-repeat;
      }
      .login-wrapper::after {
        content: "";
        position: absolute; top: -50%; left: 0; width: 100%; height: 50%;
        background: linear-gradient(180deg, transparent, rgba(232,128,26,0.06), transparent);
        animation: scanSweep 6s linear infinite;
        pointer-events: none;
      }
      .login-box {
        position: relative;
        background: rgba(14,15,11,0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        padding: 40px 36px; width: 340px;
        border: 1px solid rgba(232,128,26,0.4);
        animation: riseIn 0.6s ease both;
      }
      .login-box::before {
        content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
        background: linear-gradient(90deg, var(--accent), transparent 70%);
      }
      .login-box .tag {
        font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 2px;
        color: #3FAE66; text-transform: uppercase; margin: 0 0 10px 0;
        display: flex; align-items: center; gap: 7px;
      }
      .login-box .tag .dot {
        width: 6px; height: 6px; border-radius: 50%; background: #3FAE66;
        animation: blink 1.6s ease infinite;
      }
      .login-box h2 {
        font-family: 'Fraunces', serif; font-optical-sizing: auto;
        font-size: 30px; font-weight: 900; color: #F4EEDF; margin: 0; letter-spacing: -0.5px;
      }
      .login-box h2 span { color: var(--accent); font-style: italic; }
      .login-box p.sub {
        font-family: 'IBM Plex Mono', monospace; font-weight: 500;
        color: #8C9270; margin: 6px 0 26px 0; font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase;
      }
      .login-input {
        font-family: 'IBM Plex Mono', monospace; font-weight: 400;
        display: block; width: 100%; padding: 12px 13px; margin-bottom: 12px;
        border: 1px solid #3A3A28; font-size: 13.5px;
        background: rgba(0,0,0,0.3); color: #F4EEDF;
      }
      .login-input::placeholder { color: #6B6B52; }
      .login-input:focus { outline: none; border-color: var(--accent); }
      .login-btn {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        width: 100%; padding: 13px; background: var(--accent); color: #0E0F0B;
        border: none; font-size: 12.5px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
      }
      .login-btn:hover { background: #F4EEDF; }
      .login-error {
        font-family: 'IBM Plex Mono', monospace; font-weight: 500;
        color: #E8571A; font-size: 11.5px; margin: 0 0 10px 0;
      }


      /* ---------- AI Assistant (chatbot) ---------- */
      .chat-page { height: 100%; max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; }
      .chat-topbar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; }
      .chat-topbar span {
        font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600;
        letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted);
      }
      .chat-scroll { flex: 1; overflow-y: auto; min-height: 0; }
      .chat-hero {
        min-height: 100%; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center; padding: 20px 0;
      }
      .chat-hero h1 {
        font-family: 'Fraunces', serif; font-optical-sizing: auto; font-weight: 900;
        font-size: 40px; letter-spacing: -1px; line-height: 1.1; margin: 0 0 30px 0; color: var(--text);
        animation: riseIn 0.5s ease both;
      }
      .chat-hero h1 em { color: var(--accent); font-style: italic; }
      .chat-hero .chat-inputbar { width: 100%; animation: riseIn 0.5s ease 0.08s both; }
      .chat-suggestions {
        display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;
        margin-top: 20px; width: 100%; animation: riseIn 0.5s ease 0.16s both;
      }
      .chat-chip {
        font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; font-weight: 500;
        padding: 10px 16px; cursor: pointer; border-radius: 999px;
        background: var(--surface); color: var(--text); border: 1px solid var(--border);
        transition: all 0.15s ease;
      }
      .chat-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
      .chat-chip:disabled { opacity: 0.5; cursor: not-allowed; }

      .chat-thread { padding: 6px 2px 14px 2px; }
      .chat-row { display: flex; margin-bottom: 18px; animation: riseIn 0.3s ease both; }
      .chat-row.user { justify-content: flex-end; }
      .chat-bubble-user {
        max-width: 78%; padding: 11px 16px; border-radius: 18px 18px 4px 18px;
        background: var(--black); color: #F4EEDF; border: 1px solid var(--line);
        font-size: 14.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
      }
      .chat-bot { display: flex; gap: 12px; max-width: 92%; }
      .chat-avatar {
        width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
        background: var(--accent); color: var(--black);
        display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
      }
      .chat-bot-text { font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; padding-top: 3px; color: var(--text); }
      .chat-bot-text.error {
        color: #A3260F; border-left: 3px solid #A3260F; padding: 4px 0 4px 12px;
      }
      :root[data-theme="dark"] .chat-bot-text.error { color: #E8714C; border-left-color: #E8714C; }
      .chat-typing { display: flex; gap: 5px; padding: 10px 0; }
      .chat-typing span {
        width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted);
        animation: chatDot 1.2s ease-in-out infinite;
      }
      .chat-typing span:nth-child(2) { animation-delay: 0.15s; }
      .chat-typing span:nth-child(3) { animation-delay: 0.3s; }
      @keyframes chatDot { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }

      .chat-inputbar-wrap { padding-top: 10px; }
      .chat-inputbar {
        display: flex; align-items: flex-end; gap: 10px;
        background: var(--surface); border: 1px solid var(--border); border-radius: 22px;
        padding: 8px 8px 8px 20px; box-shadow: var(--card-shadow);
        transition: border-color 0.15s ease;
      }
      .chat-inputbar:focus-within { border-color: var(--accent); }
      .chat-inputbar textarea {
        flex: 1; resize: none; border: none; outline: none; background: transparent; color: var(--text);
        font-family: 'IBM Plex Mono', monospace; font-size: 14px; line-height: 1.5;
        padding: 9px 0; max-height: 160px;
      }
      .chat-inputbar textarea::placeholder { color: var(--text-muted); }
      .chat-send {
        width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; border: none; cursor: pointer;
        background: var(--accent); color: #fff; font-size: 18px; font-weight: 700;
        display: flex; align-items: center; justify-content: center; transition: opacity 0.15s ease;
      }
      .chat-send:disabled { opacity: 0.35; cursor: not-allowed; }
      .chat-note { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 8px; min-height: 14px; }

      /* ---------- Detect Animals page ---------- */
      .idn-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); gap: 22px; align-items: start; }
      .idn-drop {
        border: 2px dashed var(--border); background: var(--bg); min-height: 320px; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
        text-align: center; padding: 20px; transition: all 0.15s ease; color: var(--text);
      }
      .idn-drop:hover, .idn-drop.over { border-color: var(--accent); background: var(--accent-soft); }
      .idn-drop .big { font-size: 38px; }
      .idn-drop .main { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 14px; }
      .idn-drop .hint { font-size: 12.5px; color: var(--text-muted); }
      .idn-stagewrap { border: 1px solid var(--border); background: var(--bg); padding: 10px; text-align: center; }
      .idn-stage { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
      .idn-stage img { max-width: 100%; max-height: 480px; display: block; }
      .idn-box { position: absolute; }
      .idn-label {
        position: absolute; top: 0; left: 0; color: #fff; padding: 3px 9px; line-height: 1.35;
        font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; white-space: nowrap;
        text-transform: capitalize;
      }
      .idn-loading {
        position: absolute; inset: 0; background: rgba(0,0,0,0.45); color: #fff; line-height: 1.4;
        display: flex; align-items: center; justify-content: center;
        font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 600;
      }
      .idn-actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
      .idn-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
      .idn-hint { font-size: 12.5px; color: var(--text-muted); margin: -8px 0 14px 0; }
      .idn-pill {
        font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-weight: 600; white-space: nowrap;
        padding: 4px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-dark);
        border: 1px solid var(--accent);
      }
      :root[data-theme="dark"] .idn-pill { color: var(--accent); }
      .idn-row { margin-bottom: 14px; }
      .idn-row-top { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; margin-bottom: 5px; color: var(--text); }
      .idn-row-top .name { flex: 1; text-transform: capitalize; }
      .idn-row-top .pct { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
      .idn-bar { background: var(--bg); height: 7px; border-radius: 4px; }
      .idn-bar div { height: 7px; border-radius: 4px; }
      .idn-empty { font-size: 14px; color: var(--text); margin: 0; }
      .idn-chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .idn-chip {
        font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; text-transform: capitalize;
        padding: 5px 11px; border-radius: 999px; border: 1px solid; white-space: nowrap;
      }

      /* ---------- Dashboard: Recent Activity + Latest Detection (full width) ---------- */
      .recent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      .recent-card {
        border: 1px solid var(--border); border-left: 4px solid var(--border); background: var(--bg);
        padding: 13px 16px; display: flex; flex-direction: column; gap: 4px; min-width: 0;
      }
      .recent-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .recent-species { font-size: 16px; font-weight: 700; text-transform: capitalize; }
      .recent-meta { font-size: 12px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }
      .recent-decision { font-size: 12.5px; font-weight: 600; margin-top: 2px; }
      .latest-row { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
      .latest-img { width: 340px; max-width: 100%; flex-shrink: 0; cursor: pointer; }
      .latest-info { flex: 1; min-width: 300px; }
      .latest-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
      .latest-species {
        font-family: 'Fraunces', serif; font-optical-sizing: auto; font-weight: 900;
        font-size: 26px; letter-spacing: -0.5px; text-transform: capitalize;
      }
      .latest-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px 22px; margin-bottom: 16px; }
      .latest-facts .lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
      .latest-facts .val { font-size: 15px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; }
      .latest-decision { border-top: 1px solid var(--border); padding-top: 14px; display: flex; flex-direction: column; gap: 6px; }


      /* ---------- Decision engine cell ---------- */
      .dec-cell { display: flex; flex-direction: column; gap: 10px; align-items: stretch; min-width: 0; }
      .dec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .dec-title { font-size: 14.5px; font-weight: 700; line-height: 1.3; }
      .dec-tag {
        font-size: 10px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase;
        padding: 3px 7px; border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap;
      }
      .dec-reasons { margin: 0; padding: 0 0 0 16px; display: flex; flex-direction: column; gap: 5px; }
      .dec-reasons li { font-size: 13px; font-weight: 400; line-height: 1.45; color: var(--text); }
      .dec-reasons li::marker { color: var(--accent); }
      .dec-action {
        background: var(--accent-soft); border-left: 3px solid var(--accent);
        padding: 8px 10px; display: flex; flex-direction: column; gap: 2px;
      }
      .dec-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.9px; text-transform: uppercase; color: var(--text-muted); }
      .dec-action-text { font-size: 13px; font-weight: 600; line-height: 1.4; }
      .dec-tg { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 500; color: var(--text-muted); }
      .dec-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-muted); opacity: 0.55; }
      .dec-tg.sent { color: var(--accent); font-weight: 600; }
      .dec-tg.sent .dec-dot { background: var(--accent); opacity: 1; }
      .dec-tg.cooldown .dec-dot { background: #C98A1B; opacity: 1; }
      .dec-compact .dec-reasons li { font-size: 13.5px; }

      /* ---------- Telegram message editor (Settings) ---------- */
      .tg-editor {
        width: 100%; min-height: 150px; resize: vertical; padding: 12px 14px;
        font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; line-height: 1.5;
        background: var(--bg); color: var(--text); border: 1px solid var(--border);
      }
      .tg-editor:focus { outline: none; border-color: var(--accent); }
      .tg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px 0; }
      .tg-chip {
        font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; cursor: pointer;
        background: var(--surface); color: var(--accent-dark); border: 1px solid var(--border); padding: 4px 9px;
      }
      :root[data-theme="dark"] .tg-chip { color: var(--accent); }
      .tg-chip:hover { background: var(--accent); border-color: var(--accent); color: var(--surface); }
      .tg-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 24px; align-items: start; }
      @media (max-width: 900px) { .tg-grid { grid-template-columns: 1fr; } }
      .tg-preview {
        background: var(--accent-soft); border: 1px solid var(--border); border-left: 4px solid var(--accent);
        padding: 14px 16px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; min-height: 150px;
      }

      /* ---------- Danger button (Settings -> delete data) ---------- */
      .danger-btn {
        font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 12px; letter-spacing: 0.4px;
        background: #A3260F; color: #fff; border: 1px solid #A3260F; padding: 9px 16px; cursor: pointer;
      }
      .danger-btn:hover { background: #7E1D0B; border-color: #7E1D0B; }
      .danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      /* ---------- Alerts tables (Today Alerts / All Alerts) ---------- */
      /* clearly visible grid: lines between every row AND column */
      .alerts-table { --grid: #A89B6B; border: 1px solid var(--grid); }
      :root[data-theme="dark"] .alerts-table { --grid: #4A4F34; }
      .alerts-table th, .alerts-table td { border: 1px solid var(--grid); }
      .alerts-table th { font-size: 12px; color: var(--text); padding: 12px 14px; background: var(--bg); border-bottom: 2px solid var(--grid); }
      .alerts-table td { font-size: 15px; font-weight: 500; color: var(--text); vertical-align: middle; padding: 14px; }
      .alerts-table td .cls { font-weight: 700; font-size: 16px; text-transform: capitalize; }

      @media (max-width: 900px) {
        .stats-row { grid-template-columns: repeat(2, 1fr); }
        .main-area { padding: 26px 18px; }
        .chat-hero h1 { font-size: 30px; }
        .idn-grid { grid-template-columns: 1fr; }
        .recent-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 640px) {
        .recent-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

// ---------------- ZONE COLORS ----------------
const ZONE_COLORS = { deep_buffer: "#3E6E7A", near_farmland: "#C9941B", village_edge: "#A3260F" };
const zoneColor = (zone) => ZONE_COLORS[zone] || "#766B4F";

const googleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// ---------------- IMAGE MODAL (with bounding box overlay) ----------------
function ImageModal({ detection, onClose }) {
  if (!detection) return null;

  const [naturalSize, setNaturalSize] = useState(null);
  let box = null;
  try {
    const parsed = JSON.parse(detection.bbox);
    box = { x1: parsed[0], y1: parsed[1], x2: parsed[2], y2: parsed[3] };
  } catch {
    box = null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>Close</button>
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={`${API_URL}/evidence/${detection.image_path}`}
            alt="Captured detection"
            onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          />
          {box && naturalSize && (
            <div
              style={{
                position: "absolute",
                left: `${(box.x1 / naturalSize.w) * 100}%`,
                top: `${(box.y1 / naturalSize.h) * 100}%`,
                width: `${((box.x2 - box.x1) / naturalSize.w) * 100}%`,
                height: `${((box.y2 - box.y1) / naturalSize.h) * 100}%`,
                border: "3px solid #FFD400",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
              }}
            >
              <span
                style={{
                  position: "absolute", top: -24, left: -3,
                  background: "#FFD400", color: "#1B1710",
                  fontSize: 12, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 4, whiteSpace: "nowrap",
                }}
              >
                {detection.species} — {Math.round(detection.confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- LOGIN PAGE ----------------
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
      if (!res.ok) { setError("Incorrect username or password"); return; }
      const data = await res.json();
      onLogin(data.access_token);
    } catch {
      setError("Could not reach the server. Is the backend running?");
    }
  };

  return (
    <div className="login-wrapper">
      <form onSubmit={handleSubmit} className="login-box">
        <p className="tag"><span className="dot" />Field Console — Restricted Access</p>
        <h2>Forest<span>Sentinel</span></h2>
        <p className="sub">AI Wildlife Monitoring System</p>
        <input className="login-input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="login-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-btn">Authenticate →</button>
      </form>
    </div>
  );
}

// ---------------- SIDEBAR ----------------
// A slim rail that opens when the mouse hovers it (or when tapped on touch
// screens) and closes when the mouse leaves (or when tapped again).
function Sidebar({ activePage, setActivePage, onLogout }) {
  const [open, setOpen] = useState(false);
  const [touchMode, setTouchMode] = useState(false);
  // id = page name used by the router (unchanged); label = short, similar-length text shown in the menu.
  // Order: monitoring -> tools -> management -> settings.
  const items = [
    { id: "Dashboard",      label: "Dashboard" },
    { id: "Today Alerts",   label: "Recent" },
    { id: "All Alerts",     label: "History" },
    { id: "Map View",       label: "Locations" },
    { id: "Detect Animals", label: "Identify" },
    { id: "AI Assistant",   label: "Assistant" },
    { id: "Devices",        label: "Devices" },
    { id: "Add Camera",     label: "Add Device" },
    { id: "Users",          label: "Accounts" },
    { id: "Settings",       label: "Settings" },
  ];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {open && touchMode && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <div className="sidebar-slot">
        <div
          className={`sidebar ${open ? "open" : ""}`}
          onPointerDown={(e) => setTouchMode(e.pointerType !== "mouse")}
          onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
        >
          <div className="sidebar-head">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setOpen((o) => !o)}
              title={open ? "Close menu" : "Open menu"}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? "✕" : "☰"}
            </button>
            <div className="sidebar-brand">
              <h2>Forest<span>Sentinel</span></h2>
              <p>AI Wildlife Monitoring</p>
            </div>
          </div>
          <div className="stripe-bar" />
          <div className="sidebar-nav">
            {items.map((item, i) => (
              <div
                key={item.id}
                title={item.id}
                className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => { setActivePage(item.id); setOpen(false); }}
              >
                <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-logout" onClick={onLogout} title="Log Out">{open ? "Log Out" : "⏻"}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------- DETECTIONS TABLE (shared, with thumbnail + internal map link) ----------------
function DetectionsTable({ detections, cameraLookup, cameraCoords, onViewImage, onOpenMap }) {
  return (
    <table className="jungle-table">
      <thead>
        <tr><th>Species</th><th>Camera</th><th>Confidence</th><th>Timestamp</th><th>Image</th><th>Location</th></tr>
      </thead>
      <tbody>
        {detections.map((d) => {
          const coords = cameraCoords[d.camera_id];
          return (
            <tr key={d.id}>
              <td style={{ fontWeight: 600 }}>{d.species}</td>
              <td>{cameraLookup[d.camera_id] || d.camera_id}</td>
              <td>{Math.round(d.confidence * 100)}%</td>
              <td>{d.timestamp}</td>
              <td>
                {d.image_path ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={`${API_URL}/evidence/${d.image_path}`}
                      alt={d.species}
                      style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <button type="button" className="view-btn" onClick={() => onViewImage(d)}>View</button>
                  </div>
                ) : "—"}
              </td>
              <td>
                {coords ? (
                  <button type="button" className="gmaps-link" onClick={() => onOpenMap(d.camera_id)}>Map</button>
                ) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return display;
}

const timeAgo = (isoString) => {
  if (!isoString) return "—";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ---------------- DASHBOARD ----------------
function MiniSparkline({ data, color }) {
  const W = 90, H = 28;
  const max = Math.max(1, ...data);
  const stepX = W / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${H - (v / max) * H}`).join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}


// ---------------- IDENTIFY ANIMAL (manual upload) ----------------
const SPECIES_EMOJI = {
  bear: "🐻", bison: "🦬", deer: "🦌", elephant: "🐘", fox: "🦊", giraffe: "🦒",
  hyena: "🐾", leopard: "🐆", person: "🧍", tiger: "🐅", wild_boar: "🐗", wolf: "🐺", zebra: "🦓",
};
const speciesEmoji = (s) => SPECIES_EMOJI[s] || "🐾";
const prettySpecies = (s) => (s || "").replace(/_/g, " ");
const SPECIES_PALETTE = [
  "#C0502F", "#8B6B2E", "#3E8E5A", "#6B7A8F", "#D2691E", "#A8892A", "#2F8F9D",
  "#B5701B", "#8E5BA8", "#4A7FB5", "#D9582B", "#5E8F3A", "#7A5C9E",
];

function IdentifyAnimal({ token }) {
  const [classes, setClasses] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/model/info`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data && data.classes) setClasses(data.classes); })
      .catch(() => {});
  }, [token]);

  // free the browser's preview URL when it changes or the component unmounts
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const colorFor = (name) => {
    const i = classes.indexOf(name);
    const idx = i >= 0 ? i : [...(name || "")].reduce((h, ch) => h + ch.charCodeAt(0), 0);
    return SPECIES_PALETTE[idx % SPECIES_PALETTE.length];
  };

  const identify = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      setStatus("error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("That image is larger than 15 MB. Please choose a smaller one.");
      setStatus("error");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError("");
    setStatus("loading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/identify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data);
        setStatus("done");
      } else {
        setError(data.detail || "Could not identify this photo.");
        setStatus("error");
      }
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setResult(null);
    setError("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = (e) => identify(e.target.files && e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    identify(e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  const detections = result ? result.detections : [];

  return (
    <div>
      <h2 className="page-title">Detect Animals</h2>
      <p className="page-sub">Upload a field photo and the model will identify the animals in it. Nothing is saved and no alerts are sent.</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />

      <div className="idn-grid">
        <div className="panel">
          <h3>Upload Photo</h3>
          {!previewUrl ? (
            <div
              className={`idn-drop ${dragOver ? "over" : ""}`}
              onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="big">📷</div>
              <div className="main">Click to upload or drag a photo here</div>
              <div className="hint">JPG, PNG or WebP · up to 15 MB</div>
            </div>
          ) : (
            <>
              <div className="idn-stagewrap">
                <div className="idn-stage">
                  <img src={previewUrl} alt="Uploaded for identification" />
                  {result && detections.map((d, i) => {
                    const [x1, y1, x2, y2] = d.bbox;
                    const color = colorFor(d.species);
                    return (
                      <div
                        key={i}
                        className="idn-box"
                        style={{
                          left: `${(x1 / result.width) * 100}%`,
                          top: `${(y1 / result.height) * 100}%`,
                          width: `${((x2 - x1) / result.width) * 100}%`,
                          height: `${((y2 - y1) / result.height) * 100}%`,
                          border: `3px solid ${color}`,
                          background: `${color}1F`,
                        }}
                      >
                        <span className="idn-label" style={{ background: color }}>
                          {prettySpecies(d.species)} {Math.round(d.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })}
                  {status === "loading" && <div className="idn-loading">Identifying…</div>}
                </div>
              </div>
              <div className="idn-actions">
                <button type="button" className="view-btn" onClick={() => inputRef.current && inputRef.current.click()}>Choose another photo</button>
                <button type="button" className="gmaps-link" onClick={reset}>Clear</button>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="panel">
            <div className="idn-head">
              <h3>Detected Animals</h3>
              {status === "done" && <span className="idn-pill">{detections.length} found</span>}
            </div>
            <p className="idn-hint">Ranked by confidence</p>
            {status === "idle" && <p className="idn-empty">Upload a photo to see the results here.</p>}
            {status === "loading" && <p className="idn-empty">Analysing your photo…</p>}
            {status === "error" && <p className="idn-empty" style={{ color: "#A3260F" }}>{error}</p>}
            {status === "done" && detections.length === 0 && (
              <p className="idn-empty">No animals detected with enough confidence in this photo.</p>
            )}
            {status === "done" && detections.map((d, i) => (
              <div key={i} className="idn-row">
                <div className="idn-row-top">
                  <span>{speciesEmoji(d.species)}</span>
                  <span className="name">{prettySpecies(d.species)}</span>
                  <span className="pct">{(d.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="idn-bar"><div style={{ width: `${d.confidence * 100}%`, background: colorFor(d.species) }} /></div>
              </div>
            ))}
          </div>

          {classes.length > 0 && (
            <div className="panel">
              <h3>Species Colour Guide</h3>
              <div className="idn-chips">
                {classes.map((c) => {
                  const color = colorFor(c);
                  return (
                    <span key={c} className="idn-chip" style={{ color, borderColor: color, background: `${color}1A` }}>
                      {speciesEmoji(c)} {prettySpecies(c)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ cameras, detections, alerts, cameraLookup, cameraZoneLookup, cameraLocationLookup, onNavigate, onViewImage, onOpenMap, knownClassCount, decisionByDetection }) {
  const activeCameras = cameras.filter((c) => c.status === "active").length;
  const speciesSet = new Set(detections.map((d) => d.species));

  const localDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Last 7 days series, computed once and reused across the trend chart + sparklines
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const dayDetections = detections.filter((det) => det.timestamp && det.timestamp.slice(0, 10) === key);
    const dayAlerts = alerts.filter((a) => a.created_at && a.created_at.slice(0, 10) === key);
    const dangerDetections = dayDetections.filter((det) => cameraZoneLookup[det.camera_id] === "village_edge");
    const avgConf = dayDetections.length
      ? Math.round((dayDetections.reduce((s, d2) => s + d2.confidence, 0) / dayDetections.length) * 100)
      : 0;
    last7.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: dayDetections.length,
      alerts: dayAlerts.length,
      danger: dangerDetections.length,
      avgConf,
    });
  }

  // Species distribution (top 5)
  const speciesCounts = {};
  detections.forEach((d) => { speciesCounts[d.species] = (speciesCounts[d.species] || 0) + 1; });
  const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSpeciesCount = Math.max(1, ...topSpecies.map(([, c]) => c));

  // Summary stats
  const todayKey = localDateKey(new Date());
  const detectionsToday = detections.filter((d) => d.timestamp && d.timestamp.slice(0, 10) === todayKey).length;
  const yesterdayKey = localDateKey(new Date(Date.now() - 86400000));
  const detectionsYesterday = detections.filter((d) => d.timestamp && d.timestamp.slice(0, 10) === yesterdayKey).length;
  const pctChange = detectionsYesterday > 0
    ? Math.round(((detectionsToday - detectionsYesterday) / detectionsYesterday) * 100)
    : null;

  const avgConfidence = detections.length
    ? Math.round((detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length) * 100)
    : 0;
  const lastDetectionTime = detections.length ? detections[0].timestamp : null;
  const latestDetection = detections[0];

  const activeAlertsCount = alerts.filter((a) => a.status === "unresolved").length;
  const criticalAlertsCount = alerts.filter((a) => a.status === "unresolved" && a.alert_type === "boundary_alert").length;

  const nightDetectionsToday = detections.filter((d) => {
    if (!d.timestamp || d.timestamp.slice(0, 10) !== todayKey) return false;
    const hour = new Date(d.timestamp).getHours();
    return hour >= 18 || hour < 6;
  }).length;

  const dangerDetectionsToday = detections.filter(
    (d) => d.timestamp && d.timestamp.slice(0, 10) === todayKey && cameraZoneLookup[d.camera_id] === "village_edge"
  ).length;

  // the alert (if any) that belongs to each detection - used to show its alert type
  const alertByDetection = {};
  alerts.forEach((a) => { if (a.detection_id != null && !alertByDetection[a.detection_id]) alertByDetection[a.detection_id] = a; });

  const alertsToday = alerts.filter((a) => a.created_at && a.created_at.slice(0, 10) === todayKey).length;

  return (
    <div>
      <h2 className="page-title">Wildlife Monitoring Overview</h2>
      <p className="page-sub">Monitor wildlife activity using AI</p>

      <div className="stats-row" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-number"><CountUp value={detectionsToday} /></div>
          <div className="stat-label">Detected Today</div>
          {pctChange !== null && (
            <div style={{ fontSize: 11, marginTop: 4, color: pctChange >= 0 ? "#2E7D46" : "#A3260F", fontFamily: "IBM Plex Mono" }}>
              {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange)}% from yesterday
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-number"><CountUp value={activeAlertsCount} /></div>
          <div className="stat-label">Active Alerts</div>
          <div
            style={{ fontSize: 11, marginTop: 4, color: "var(--accent)", cursor: "pointer", fontFamily: "IBM Plex Mono" }}
            onClick={() => onNavigate("All Alerts")}
          >
            View all →
          </div>
        </div>
        <div className="stat-card" style={criticalAlertsCount > 0 ? { borderLeft: "3px solid #A3260F" } : {}}>
          <div className="stat-number" style={criticalAlertsCount > 0 ? { color: "#A3260F" } : {}}><CountUp value={criticalAlertsCount} /></div>
          <div className="stat-label">Critical Alerts</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}>
            {criticalAlertsCount > 0 ? "Requires attention" : "None right now"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-number"><CountUp value={nightDetectionsToday} /></div>
          <div className="stat-label">Night Detections</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}>Since 6:00 PM</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-number">{activeCameras}/{cameras.length}</div>
          <div className="stat-label">Cameras Active</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}>
            {cameras.length ? Math.round((activeCameras / cameras.length) * 100) : 0}% operational
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Recent Activity</h3>
        {detections.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>No detections yet — run the simulator to generate some.</p>
        ) : (
          <div className="recent-grid">
            {detections.slice(0, 6).map((d) => {
              const dec = decisionByDetection[d.id];
              const al = alertByDetection[d.id];
              const stripe = al ? alertTypeColor(al.alert_type) : "var(--border)";
              return (
                <div key={d.id} className="recent-card" style={{ borderLeftColor: stripe }}>
                  <div className="recent-top">
                    <span className="recent-species">{prettyClass(d.species)}</span>
                    {al && <span className="zone-badge" style={{ background: alertTypeColor(al.alert_type) }}>{alertTypeDisplay(al.alert_type)}</span>}
                  </div>
                  <div className="recent-meta">{cameraLocationLookup[d.camera_id] || d.camera_id} — {zoneDisplay(cameraZoneLookup[d.camera_id])}</div>
                  <div className="recent-meta">{formatTime12hr(d.timestamp)}</div>
                  {dec && dec.decision_type !== "routine" && <div className="recent-decision">{dec.title}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Latest Detection</h3>
        {latestDetection ? (
          <div className="latest-row">
            <div className="latest-img" onClick={() => onViewImage(latestDetection)}>
              <AnnotatedThumb detection={latestDetection} onClick={() => onViewImage(latestDetection)} width="100%" />
            </div>
            <div className="latest-info">
              <div className="latest-head">
                <span className="latest-species">{prettyClass(latestDetection.species)}</span>
                {alertByDetection[latestDetection.id] && (
                  <span className="zone-badge" style={{ background: alertTypeColor(alertByDetection[latestDetection.id].alert_type) }}>
                    {alertTypeDisplay(alertByDetection[latestDetection.id].alert_type)}
                  </span>
                )}
              </div>
              <div className="latest-facts">
                {[
                  ["Confidence", `${Math.round(latestDetection.confidence * 100)}%`],
                  ["Time", formatTime12hr(latestDetection.timestamp)],
                  ["Location", cameraLocationLookup[latestDetection.camera_id] || latestDetection.camera_id],
                  ["Camera", cameraLookup[latestDetection.camera_id] || latestDetection.camera_id],
                  ["Zone", zoneDisplay(cameraZoneLookup[latestDetection.camera_id])],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="lbl">{label}</div>
                    <div className="val">{value}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const dec = decisionByDetection[latestDetection.id];
                if (!dec) return null;
                return (
                  <div className="latest-decision">
                    <DecisionCell dec={dec} compact />
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>No detections yet.</p>
        )}
      </div>

      <div className="panel">
        <h3>Quick Statistics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Species Detected</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{speciesSet.size} <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}>of {knownClassCount !== null ? knownClassCount : "…"}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Danger Zone Today</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>{dangerDetectionsToday}</div>
            <MiniSparkline data={last7.map((d) => d.danger)} color="#A3260F" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Alerts Today</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>{alertsToday}</div>
            <MiniSparkline data={last7.map((d) => d.alerts)} color="#C9941B" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Avg. Confidence</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>{avgConfidence}%</div>
            <MiniSparkline data={last7.map((d) => d.avgConf)} color="#3E6E7A" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div className="panel" style={{ flex: 1, minWidth: 320 }}>
          <h3>Species Distribution</h3>
          {topSpecies.map(([species, count]) => (
            <div key={species} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 500, marginBottom: 4, fontFamily: "IBM Plex Mono" }}>
                <span>{species}</span><span>{count}</span>
              </div>
              <div style={{ background: "var(--bg)", height: 8, borderRadius: 4 }}>
                <div style={{ background: "var(--accent)", height: 8, borderRadius: 4, width: `${(count / maxSpeciesCount) * 100}%` }} />
              </div>
            </div>
          ))}
          {topSpecies.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 15 }}>No detections yet.</p>}
          <button type="button" className="view-btn" style={{ marginTop: 8 }} onClick={() => onNavigate("AI Assistant")}>Ask AI</button>
        </div>

        <div className="panel" style={{ flex: 1, minWidth: 320 }}>
          <h3>Monitoring Summary</h3>
          {[
            ["Active Cameras", activeCameras],
            ["Total Species", speciesSet.size],
            ["Avg. Confidence", `${avgConfidence}%`],
            ["Detections Today", detectionsToday],
            ["Last Detection", timeAgo(lastDetectionTime)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 15, fontFamily: "IBM Plex Mono" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <button type="button" className="view-btn" style={{ marginTop: 12 }} onClick={() => onNavigate("AI Assistant")}>Ask AI</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- ALERTS ----------------
const ALERT_TYPE_DISPLAY = {
  boundary_alert: "Boundary Alert",
  proximity_watch: "Proximity Watch",
  suspicious_activity: "Suspicious Activity",
  unusual_activity: "Unusual Activity",
  possible_injury: "Possible Injury",
};
const alertTypeDisplay = (type) => ALERT_TYPE_DISPLAY[type] || type;

const ALERT_TYPE_COLOR = {
  boundary_alert: "#A3260F",
  proximity_watch: "#C9941B",
  suspicious_activity: "#7A2E8E",
  unusual_activity: "#2F6F9D",
  possible_injury: "#B5431F",
};
const alertTypeColor = (type) => ALERT_TYPE_COLOR[type] || "#766B4F";

// ---- Decision engine helpers (risk levels stay in the backend; the UI shows alert types) ----
const telegramLabel = (status) =>
  status === "sent" ? "Residents alerted on Telegram"
  : status === "cooldown" ? "Residents already alerted recently"
  : "Dashboard only";

// One tidy block for a decision: title, bulleted reasons, highlighted action, Telegram status.
const DECISION_TAG = {
  human_wildlife_conflict: "For residents",
  zone_risk: "For residents",
  suspicious_human_activity: "For officials",
  possible_injury: "For officials",
  unusual_activity: "For officials",
};

function DecisionCell({ dec, compact = false }) {
  if (!dec) return <span style={{ color: "var(--text-muted)", fontSize: 13 }}>No decision recorded (older alert)</span>;
  const tag = DECISION_TAG[dec.decision_type];
  const reasons = dec.reasons || [];
  return (
    <div className={`dec-cell${compact ? " dec-compact" : ""}`}>
      <div className="dec-head">
        <span className="dec-title">{dec.title}</span>
        {tag && <span className="dec-tag">{tag}</span>}
      </div>
      {reasons.length > 0 && (
        <ul className="dec-reasons">
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {dec.action && (
        <div className="dec-action">
          <span className="dec-label">Recommended action</span>
          <span className="dec-action-text">{dec.action}</span>
        </div>
      )}
      <div className={`dec-tg ${dec.telegram || "none"}`}>
        <span className="dec-dot" />
        {telegramLabel(dec.telegram)}
      </div>
    </div>
  );
}

function AlertsPage({ alerts, title, detections, cameraLookup, cameraZoneLookup, cameraLocationLookup, decisionByDetection, cameras, onViewImage }) {
  const [filterType, setFilterType] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [filterCamera, setFilterCamera] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  let filteredAlerts = alerts;
  if (filterType !== "all") filteredAlerts = filteredAlerts.filter((a) => a.alert_type === filterType);
  if (filterZone !== "all") filteredAlerts = filteredAlerts.filter((a) => cameraZoneLookup[a.camera_id] === filterZone);
  if (filterCamera !== "all") filteredAlerts = filteredAlerts.filter((a) => String(a.camera_id) === filterCamera);
  if (filterDate) filteredAlerts = filteredAlerts.filter((a) => a.created_at && a.created_at.slice(0, 10) === filterDate);

  const selectStyle = { width: 190, margin: 0, background: "var(--surface)", color: "var(--text)" };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.6px" };

  return (
    <div>
      <h2 className="page-title">{title}</h2>
      <p className="page-sub" style={{ color: "var(--text)" }}>Boundary, proximity, and behavior alerts from the field</p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={labelStyle}>Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="login-input" style={selectStyle}>
            <option value="all">All types</option>
            <option value="boundary_alert">Boundary Alert</option>
            <option value="proximity_watch">Proximity Watch</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="unusual_activity">Unusual Activity</option>
            <option value="possible_injury">Possible Injury</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={labelStyle}>Zone</label>
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="login-input" style={selectStyle}>
            <option value="all">All zones</option>
            <option value="deep_buffer">Deep Buffer</option>
            <option value="near_farmland">Near Farmland</option>
            <option value="village_edge">Village Edge</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={labelStyle}>Camera</label>
          <select value={filterCamera} onChange={(e) => setFilterCamera(e.target.value)} className="login-input" style={selectStyle}>
            <option value="all">All cameras</option>
            {(cameras || []).map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={labelStyle}>Date</label>
          <input
            type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="login-input" style={{ ...selectStyle, width: 160 }}
          />
          {filterDate && (
            <button type="button" className="gmaps-link" onClick={() => setFilterDate("")}>Clear</button>
          )}
        </div>

        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {filteredAlerts.length} of {alerts.length} alerts
        </span>
      </div>

      <div className="panel">
        <AlertsTable
          alerts={filteredAlerts}
          detections={detections}
          cameraLocationLookup={cameraLocationLookup}
          cameraZoneLookup={cameraZoneLookup}
          decisionByDetection={decisionByDetection}
          onViewImage={onViewImage}
        />
        {filteredAlerts.length === 0 && alerts.length > 0 && (
          <p style={{ color: "var(--text)", fontSize: 14, marginTop: 8 }}>No alerts match these filters.</p>
        )}
        {alerts.length === 0 && (
          <p style={{ color: "var(--text)", fontSize: 14, marginTop: 8 }}>
            Alerts are created automatically for boundary/farmland detections, or when the decision engine flags possible conflict or distress.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------- AI ASSISTANT (chatbot page) ----------------
const CHAT_SUGGESTIONS = [
  "How many tigers were detected this week?",
  "Which camera has the most activity?",
  "Summarize today's alerts",
  "What did the decision engine flag today?",
  "Which zone has the most critical alerts?",
];

function AssistantChat({ token }) {
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant'|'error', text }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds left after a rate limit
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // grow the textarea with its content (up to a max height)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  // rate-limit countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const blocked = loading || cooldown > 0;

  const sendQuestion = async (raw) => {
    const question = raw.trim();
    if (!question || blocked) return;

    // last few turns so follow-up questions work ("and yesterday?")
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/assistant/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
      } else {
        if (res.status === 429) {
          setCooldown(Math.min(data.retry_after || 30, 90));
          setInput(question); // keep the question so it can be re-sent after the wait
        }
        setMessages((prev) => [...prev, { role: "error", text: (typeof data.detail === "string" && data.detail) || `The assistant hit a server error (HTTP ${res.status}). Check the backend terminal for details.` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "error", text: "Could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const inputBar = (
    <div className="chat-inputbar-wrap">
      <form className="chat-inputbar" onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about detections, alerts, or cameras..."
        />
        <button type="submit" className="chat-send" disabled={blocked || !input.trim()} aria-label="Send">↑</button>
      </form>
      <div className="chat-note">
        {cooldown > 0 ? `Free-tier limit reached — you can ask again in ${cooldown}s` : ""}
      </div>
    </div>
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-page">
      {hasMessages && (
        <div className="chat-topbar">
          <span>AI Assistant</span>
          <button type="button" className="gmaps-link" onClick={() => setMessages([])}>New chat</button>
        </div>
      )}

      <div className="chat-scroll" ref={scrollRef}>
        {!hasMessages ? (
          <div className="chat-hero">
            <h1>What would you like to <em>know</em>?</h1>
            {inputBar}
            <div className="chat-suggestions">
              {CHAT_SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chat-chip" disabled={blocked} onClick={() => sendQuestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-thread">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="chat-row user">
                  <div className="chat-bubble-user">{m.text}</div>
                </div>
              ) : (
                <div key={i} className="chat-row">
                  <div className="chat-bot">
                    <div className="chat-avatar">◈</div>
                    <div className={`chat-bot-text ${m.role === "error" ? "error" : ""}`}>{m.text}</div>
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className="chat-row">
                <div className="chat-bot">
                  <div className="chat-avatar">◈</div>
                  <div className="chat-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {hasMessages && inputBar}
    </div>
  );
}

// ---------------- MAP VIEW (Leaflet + OpenStreetMap) ----------------
function MapView({ cameras, focusCameraId }) {
  const [leafletMissing, setLeafletMissing] = useState(false);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByIdRef = useRef({});

  // Effect 1: create the map ONCE on mount. Never re-runs on data refresh,
  // so your pan/zoom position is never reset just because new data arrived.
  useEffect(() => {
    if (!window.L) {
      setLeafletMissing(true);
      return;
    }
    setLeafletMissing(false);

    const map = window.L.map("map").setView([20.24, 79.36], 12);

    const satellite = window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" }
    );
    // Esri's keyless reference overlay (place names + boundaries). The previous
    // CARTO labels layer now requires an API key and drew an "API key required"
    // watermark over the map.
    const placeLabels = window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Labels &copy; Esri",
        pane: "shadowPane",
        maxZoom: 19,
      }
    );
    const street = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    });

    satellite.addTo(map);
    placeLabels.addTo(map);
    window.L.control.layers(
      { "Satellite": satellite, "Street": street },
      { "Place Labels": placeLabels }
    ).addTo(map);

    const markersLayer = window.L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []); // <-- empty deps: runs once, not on every cameras/focus change

  // Effect 2: update markers whenever camera data changes, WITHOUT touching
  // the current view/zoom - so a background data refresh never yanks your pan away.
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    markersByIdRef.current = {};

    cameras.forEach((camera) => {
      const color = zoneColor(camera.zone);
      const marker = window.L.circleMarker([camera.latitude, camera.longitude], {
        radius: 9, color, fillColor: color, fillOpacity: 0.85, weight: 2,
      }).addTo(markersLayer).bindPopup(
        `<strong>${camera.name}</strong><br/>${camera.zone}<br/>Status: ${camera.status}<br/>` +
        `<a href="${googleMapsUrl(camera.latitude, camera.longitude)}" target="_blank" rel="noopener noreferrer" style="color:#2E7D46;font-weight:700;">Open in Google Maps</a>`
      );
      markersByIdRef.current[camera.id] = { marker, lat: camera.latitude, lng: camera.longitude };
    });
  }, [cameras]);

  // Effect 3: only pan/zoom to a camera when focusCameraId itself actually
  // changes (i.e. you clicked "View on Map" somewhere) - not on data polling.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCameraId) return;
    const target = markersByIdRef.current[focusCameraId];
    if (target) {
      map.setView([target.lat, target.lng], 14);
      target.marker.openPopup();
    }
  }, [focusCameraId]);

  const pan = (dx, dy) => {
    if (mapRef.current) mapRef.current.panBy([dx, dy]);
  };

  return (
    <div>
      <h2 className="page-title">Map View</h2>
      <p className="page-sub">Camera locations across the reserve</p>
      {leafletMissing && (
        <div className="panel" style={{ borderLeft: "4px solid #C0392B" }}>
          <strong style={{ color: "#C0392B" }}>Map library not loaded.</strong>
          <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 6 }}>
            Add these two lines inside the <code>&lt;head&gt;</code> of <code>frontend/index.html</code>, then restart <code>npm run dev</code>:
          </p>
          <pre style={{ background: "var(--bg)", padding: 10, borderRadius: 6, fontSize: 12, overflowX: "auto" }}>
{`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`}
          </pre>
        </div>
      )}
      <div className="panel" style={{ padding: 8, position: "relative" }}>
        <div id="map" style={{ height: "560px", borderRadius: 8 }}></div>
        <div className="pan-control">
          <button type="button" onClick={() => pan(0, -80)} className="pan-btn pan-up" title="Pan up">▲</button>
          <button type="button" onClick={() => pan(-80, 0)} className="pan-btn pan-left" title="Pan left">◀</button>
          <button type="button" onClick={() => pan(80, 0)} className="pan-btn pan-right" title="Pan right">▶</button>
          <button type="button" onClick={() => pan(0, 80)} className="pan-btn pan-down" title="Pan down">▼</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- DEVICES ----------------
function CameraEditForm({ camera, onSave, onCancel }) {
  const [lat, setLat] = useState(camera.latitude);
  const [lng, setLng] = useState(camera.longitude);
  const [zone, setZone] = useState(camera.zone);
  const [locationName, setLocationName] = useState(camera.location_name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(camera.id, { latitude: parseFloat(lat), longitude: parseFloat(lng), zone, location_name: locationName });
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        Location Name (shown in alerts instead of camera ID)
        <input
          type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g. Near Sitaram Peth"
          className="login-input" style={{ marginTop: 3, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
        />
      </label>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        Latitude
        <input
          type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)}
          className="login-input" style={{ marginTop: 3, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
        />
      </label>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        Longitude
        <input
          type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)}
          className="login-input" style={{ marginTop: 3, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
        />
      </label>
      <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        Zone
        <select
          value={zone} onChange={(e) => setZone(e.target.value)}
          className="login-input" style={{ marginTop: 3, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
        >
          <option value="deep_buffer">Deep Buffer</option>
          <option value="near_farmland">Near Farmland</option>
          <option value="village_edge">Village Edge</option>
        </select>
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" className="view-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" className="gmaps-link" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

function Devices({ cameras, onOpenMap, onUpdateCamera, onToggleStatus, onDeleteCamera }) {
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const handleSave = async (cameraId, payload) => {
    await onUpdateCamera(cameraId, payload);
    setEditingId(null);
  };

  const handleToggle = async (camera) => {
    setBusyId(camera.id);
    await onToggleStatus(camera.id, camera.status === "active" ? "inactive" : "active");
    setBusyId(null);
  };

  const handleDelete = async (camera) => {
    const confirmed = window.confirm(
      `Delete "${camera.name}"? This removes the camera and its detection/alert history. Evidence photos on disk are kept.`
    );
    if (!confirmed) return;
    setBusyId(camera.id);
    await onDeleteCamera(camera.id);
    setBusyId(null);
  };

  return (
    <div>
      <h2 className="page-title">Devices</h2>
      <p className="page-sub">All registered camera traps</p>
      <div className="cam-grid">
        {cameras.map((c) => (
          <div key={c.id} className="cam-card">
            <div className="cam-card-head">{c.name}</div>
            <div className="cam-card-body">
              {editingId === c.id ? (
                <CameraEditForm camera={c} onSave={handleSave} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <span className="zone-badge" style={{ background: zoneColor(c.zone) }}>{zoneDisplay(c.zone)}</span>
                  </div>
                  {c.location_name && (
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.location_name}</div>
                  )}
                  <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{c.latitude}, {c.longitude}</div>
                  <div style={{ fontSize: 14, marginTop: 4, marginBottom: 10 }}>
                    Status: <strong style={{ color: c.status === "active" ? "#2E7D46" : "#A3260F" }}>{c.status}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="gmaps-link" onClick={() => onOpenMap(c.id)}>View on Map</button>
                    <button type="button" className="view-btn" onClick={() => setEditingId(c.id)}>Edit</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button
                      type="button"
                      className="view-btn"
                      onClick={() => handleToggle(c)}
                      disabled={busyId === c.id}
                    >
                      {c.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="gmaps-link"
                      style={{ background: "#6B241A" }}
                      onClick={() => handleDelete(c)}
                      disabled={busyId === c.id}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- USERS ----------------
function Users({ onLogout }) {
  return (
    <div>
      <h2 className="page-title">Users</h2>
      <p className="page-sub">Account and session</p>
      <div className="panel">
        <p>Logged in as: <strong>admin</strong></p>
        <button type="button" className="login-btn" style={{ width: 160 }} onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}

// ---------------- REGISTER CAMERA ----------------
function RegisterCamera({ token, onRegistered }) {
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [zone, setZone] = useState("deep_buffer");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, message: string }

  const resetForm = () => {
    setName(""); setLocationName(""); setLat(""); setLng(""); setZone("deep_buffer"); setFiles([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!name.trim() || lat === "" || lng === "") {
      setResult({ ok: false, message: "Name, latitude, and longitude are required." });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("latitude", lat);
      formData.append("longitude", lng);
      formData.append("zone", zone);
      formData.append("location_name", locationName.trim());
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`${API_URL}/cameras`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult({
          ok: true,
          message: `"${data.name}" registered${data.images_uploaded ? ` with ${data.images_uploaded} image(s)` : ""}. Its image folder was created at ${data.image_folder}.`,
        });
        resetForm();
        if (onRegistered) onRegistered();
      } else {
        const err = await res.json();
        setResult({ ok: false, message: err.detail || "Could not register camera." });
      }
    } catch (err) {
      setResult({ ok: false, message: "Could not reach the server." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Add Camera</h2>
      <p className="page-sub">Add a new camera trap to the network</p>
      <div className="panel" style={{ maxWidth: 460 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Camera Name (internal ID)
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Camera_9" className="login-input"
              style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
            />
          </label>

          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Location Name (shown in alerts instead of the camera ID — optional)
            <input
              type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near Sitaram Peth" className="login-input"
              style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
            />
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
              Latitude
              <input
                type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)}
                className="login-input" style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
              />
            </label>
            <label style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
              Longitude
              <input
                type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)}
                className="login-input" style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
              />
            </label>
          </div>

          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Zone
            <select
              value={zone} onChange={(e) => setZone(e.target.value)}
              className="login-input" style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
            >
              <option value="deep_buffer">Deep Buffer</option>
              <option value="near_farmland">Near Farmland</option>
              <option value="village_edge">Village Edge</option>
            </select>
          </label>

          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Initial Images (optional — can add more to the images/ folder later)
            <input
              type="file" accept="image/*" multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="login-input" style={{ marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)", padding: 8 }}
            />
          </label>
          {files.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{files.length} file(s) selected</p>
          )}

          {result && (
            <p style={{ fontSize: 14, color: result.ok ? "#2E7D46" : "#A3260F", margin: 0 }}>
              {result.message}
            </p>
          )}

          <button type="submit" className="login-btn" disabled={submitting} style={{ marginTop: 4 }}>
            {submitting ? "Adding..." : "Add Camera"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------- SETTINGS ----------------
function Settings({ theme, toggleTheme, token, onDataCleared }) {
  const [simStatus, setSimStatus] = useState(null); // null = unknown, true/false once fetched
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleteOk, setDeleteOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(20);
  const [savedMsg, setSavedMsg] = useState("");

  // ---- Telegram message editor ----
  const [tgTemplate, setTgTemplate] = useState("");
  const [tgSaved, setTgSaved] = useState("");        // what is currently stored on the server
  const [tgDefault, setTgDefault] = useState("");
  const [tgPlaceholders, setTgPlaceholders] = useState({});
  const [tgMax, setTgMax] = useState(1500);
  const [tgPreview, setTgPreview] = useState("");
  const [tgMsg, setTgMsg] = useState("");
  const [tgOk, setTgOk] = useState(true);
  const [tgBusy, setTgBusy] = useState(false);
  const tgRef = useRef(null);
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API_URL}/settings/telegram`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setTgTemplate(d.template); setTgSaved(d.template); setTgDefault(d.default_template);
        setTgPlaceholders(d.placeholders || {}); setTgMax(d.max_length || 1500);
      })
      .catch(() => setTgMsg("Could not load the saved message."));
  }, []);

  // live preview (rendered by the backend so it matches what is actually sent)
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`${API_URL}/settings/telegram/preview`, {
        method: "POST", headers: authHeaders, body: JSON.stringify({ template: tgTemplate }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setTgPreview(d.message); })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [tgTemplate]);

  const insertPlaceholder = (name) => {
    const el = tgRef.current;
    const tag = `{${name}}`;
    if (!el) { setTgTemplate((t) => t + tag); return; }
    const start = el.selectionStart ?? tgTemplate.length;
    const end = el.selectionEnd ?? tgTemplate.length;
    setTgTemplate(tgTemplate.slice(0, start) + tag + tgTemplate.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + tag.length, start + tag.length); });
  };

  const saveTelegram = async (text) => {
    setTgBusy(true); setTgMsg("");
    try {
      const res = await fetch(`${API_URL}/settings/telegram`, {
        method: "PUT", headers: authHeaders, body: JSON.stringify({ template: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setTgTemplate(d.template); setTgSaved(d.template); setTgOk(true);
        setTgMsg(d.is_default ? "Using the default message." : "Saved — the next Telegram alert will use this message.");
      } else {
        setTgOk(false); setTgMsg((typeof d.detail === "string" && d.detail) || "Could not save the message.");
      }
    } catch {
      setTgOk(false); setTgMsg("Could not reach the server.");
    } finally {
      setTgBusy(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/simulate/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSimStatus(data.running);
      if (typeof data.min_delay === "number") setMinDelay(data.min_delay);
      if (typeof data.max_delay === "number") setMaxDelay(data.max_delay);
    } catch {
      setSimStatus(null);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const handleStart = async () => {
    setBusy(true);
    try {
      await fetch(`${API_URL}/simulate/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await checkStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await fetch(`${API_URL}/simulate/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await checkStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTiming = async () => {
    setSavedMsg("");
    if (minDelay < 1 || maxDelay < minDelay) {
      setSavedMsg("Min must be ≥ 1 and max must be ≥ min.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/simulate/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ min_delay: minDelay, max_delay: maxDelay }),
      });
      if (res.ok) {
        setSavedMsg("Saved — takes effect on the next simulated event.");
      } else {
        setSavedMsg("Could not save — check the values and try again.");
      }
    } catch {
      setSavedMsg("Could not reach the server.");
    }
  };

  const handleDeleteData = async () => {
    setDeleting(true);
    setDeleteMsg("");
    try {
      const res = await fetch(`${API_URL}/admin/clear-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeleteOk(true);
        setDeleteMsg(`Deleted ${data.detections} detections, ${data.alerts} alerts, ${data.decisions} decisions and ${data.images} evidence photos.`);
        if (onDataCleared) onDataCleared();
      } else {
        setDeleteOk(false);
        setDeleteMsg((typeof data.detail === "string" && data.detail) || "Could not delete the data.");
      }
    } catch {
      setDeleteOk(false);
      setDeleteMsg("Could not reach the server.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Appearance and system controls</p>

      <div className="panel">
        <h3>Appearance</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 320 }}>
          <span style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 500 }}>
            {theme === "light" ? "Light mode" : "Dark mode"}
          </span>
          <button type="button" className="view-btn" onClick={toggleTheme}>Switch</button>
        </div>
      </div>

      <div className="panel">
        <h3>Simulation Control</h3>
        <p style={{ fontSize: 14.5, color: "var(--text-muted)", marginBottom: 12 }}>
          Starts or stops the backend's built-in camera trap simulator. This is separate from running
          <code> python simulate.py </code> manually in a terminal — if that script is also running,
          stopping this one will not stop that one. Only run one at a time to avoid double data.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <span
            style={{
              width: 9, height: 9, borderRadius: "50%", display: "inline-block",
              background: simStatus === true ? "#5C7A3D" : simStatus === false ? "#A3260F" : "#766B4F",
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {simStatus === true ? "Running" : simStatus === false ? "Stopped" : "Checking..."}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          <button type="button" className="view-btn" onClick={handleStart} disabled={busy || simStatus === true}>Start Simulation</button>
          <button type="button" className="gmaps-link" onClick={handleStop} disabled={busy || simStatus === false}>Stop Simulation</button>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-muted)", marginBottom: 10 }}>
            Trigger Interval (seconds)
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Min
              <input
                type="number" min={1} value={minDelay}
                onChange={(e) => setMinDelay(parseInt(e.target.value) || 1)}
                className="login-input"
                style={{ width: 90, marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
              />
            </label>
            <label style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Max
              <input
                type="number" min={1} value={maxDelay}
                onChange={(e) => setMaxDelay(parseInt(e.target.value) || 1)}
                className="login-input"
                style={{ width: 90, marginTop: 4, marginBottom: 0, background: "var(--bg)", color: "var(--text)" }}
              />
            </label>
            <button type="button" className="view-btn" onClick={handleSaveTiming}>Save</button>
          </div>
          {savedMsg && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>{savedMsg}</p>}
        </div>
      </div>

      <div className="panel">
        <h3>Telegram Alert Message</h3>
        <p style={{ fontSize: 14.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Write the message residents receive on Telegram when a high-risk alert is sent. Click a field below to
          drop it in at your cursor — it is replaced with real details for each alert. Lines whose fields come out
          empty are skipped automatically.
        </p>
        <div className="tg-grid">
          <div>
            <textarea
              ref={tgRef} className="tg-editor" value={tgTemplate} maxLength={tgMax}
              onChange={(e) => setTgTemplate(e.target.value)}
              placeholder="Type your alert message..."
            />
            <div className="tg-chips">
              {Object.entries(tgPlaceholders).map(([name, hint]) => (
                <button key={name} type="button" className="tg-chip" title={hint} onClick={() => insertPlaceholder(name)}>
                  {`{${name}}`}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="view-btn" disabled={tgBusy || tgTemplate === tgSaved || !tgTemplate.trim()} onClick={() => saveTelegram(tgTemplate)}>
                {tgBusy ? "Saving..." : "Save Message"}
              </button>
              <button type="button" className="gmaps-link" disabled={tgBusy || (tgTemplate === tgDefault && tgSaved === tgDefault)} onClick={() => { setTgTemplate(tgDefault); saveTelegram(""); }}>
                Reset to Default
              </button>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{tgTemplate.length}/{tgMax}</span>
            </div>
            {tgMsg && <p style={{ fontSize: 13.5, marginTop: 10, color: tgOk ? "#2E7D46" : "#A3260F" }}>{tgMsg}</p>}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-muted)", marginBottom: 8 }}>
              Preview (sample data)
            </div>
            <div className="tg-preview">{tgPreview || "—"}</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              The evidence photo is still sent right after this message.
            </p>
          </div>
        </div>
      </div>

      <div className="panel" style={{ borderColor: "#A3260F" }}>
        <h3>Data Management</h3>
        <p style={{ fontSize: 14.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Clear out old data you no longer need. This permanently deletes every <b>detection, alert, decision and saved
          evidence photo</b>. Your cameras, users and settings are kept. This cannot be undone.
        </p>
        {simStatus === true && (
          <p style={{ fontSize: 13.5, color: "#A3260F", marginBottom: 14 }}>
            The simulator is running, so new data will keep arriving. Stop it first if you want a clean start.
          </p>
        )}
        {!confirmingDelete ? (
          <button type="button" className="danger-btn" onClick={() => { setDeleteMsg(""); setConfirmingDelete(true); }}>
            Delete All Monitoring Data
          </button>
        ) : (
          <div style={{ border: "1px solid #A3260F", padding: 16, background: "var(--bg)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px 0" }}>
              Are you sure? All detections, alerts, decisions and evidence photos will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="danger-btn" onClick={handleDeleteData} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
              <button type="button" className="gmaps-link" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        )}
        {deleteMsg && (
          <p style={{ fontSize: 14, marginTop: 12, color: deleteOk ? "#2E7D46" : "#A3260F" }}>{deleteMsg}</p>
        )}
      </div>
    </div>
  );
}

const ZONE_DISPLAY = {
  deep_buffer: "Deep Forest",
  near_farmland: "Near Farmland",
  village_edge: "Village Edge",
};
const zoneDisplay = (zone) => ZONE_DISPLAY[zone] || zone;

const formatTime12hr = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const isToday = (isoString) => {
  if (!isoString) return false;
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return isoString.slice(0, 10) === todayKey;
};

// ---------------- MID-SIZED ANNOTATED THUMBNAIL ----------------
function AnnotatedThumb({ detection, onClick, width = 150 }) {
  const [naturalSize, setNaturalSize] = useState(null);
  let box = null;
  try {
    const parsed = JSON.parse(detection.bbox);
    box = { x1: parsed[0], y1: parsed[1], x2: parsed[2], y2: parsed[3] };
  } catch {
    box = null;
  }

  return (
    <div
      onClick={onClick}
      style={{ position: "relative", display: "inline-block", width, maxWidth: "100%", cursor: "pointer" }}
    >
      <img
        src={`${API_URL}/evidence/${detection.image_path}`}
        alt={detection.species}
        onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        style={{ width: "100%", display: "block", border: "1px solid var(--border)" }}
      />
      {box && naturalSize && (
        <div
          style={{
            position: "absolute",
            left: `${(box.x1 / naturalSize.w) * 100}%`,
            top: `${(box.y1 / naturalSize.h) * 100}%`,
            width: `${((box.x2 - box.x1) / naturalSize.w) * 100}%`,
            height: `${((box.y2 - box.y1) / naturalSize.h) * 100}%`,
            border: "2px solid #FFD400",
          }}
        />
      )}
    </div>
  );
}

// ---------------- RECENT DETECTIONS (today only) ----------------
const withinLastHours = (isoString, hours) => {
  if (!isoString) return false;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
};

// ---------------- SHARED ALERTS TABLE ----------------
const prettyClass = (s) => (s || "").replace(/_/g, " ");

function AlertsTable({ alerts, detections, cameraLocationLookup, cameraZoneLookup, decisionByDetection, onViewImage }) {
  const detectionById = {};
  (detections || []).forEach((d) => { detectionById[d.id] = d; });

  if (alerts.length === 0) {
    return <p style={{ color: "var(--text)", fontSize: 15 }}>Nothing to show here right now.</p>;
  }

  return (
    <table className="jungle-table alerts-table">
      <thead>
        <tr>
          <th style={{ width: 180 }}>Image</th>
          <th>Class</th>
          <th>Time</th>
          <th>Location</th>
          <th>Zone &amp; Alert Type</th>
          <th style={{ minWidth: 340 }}>Decision Engine</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((alert) => {
          const det = detectionById[alert.detection_id];
          const location = cameraLocationLookup ? cameraLocationLookup[alert.camera_id] : null;
          const dec = decisionByDetection ? decisionByDetection[alert.detection_id] : null;
          return (
            <tr key={alert.id}>
              <td>
                {det && det.image_path ? (
                  <AnnotatedThumb detection={det} onClick={() => onViewImage(det)} />
                ) : "—"}
              </td>
              <td><span className="cls">{det ? prettyClass(det.species) : "—"}</span></td>
              <td>{formatTime12hr(alert.created_at)}</td>
              <td>{location || `Camera ${alert.camera_id}`}</td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <span>{cameraZoneLookup ? zoneDisplay(cameraZoneLookup[alert.camera_id]) : "—"}</span>
                  <span className="zone-badge" style={{ background: alertTypeColor(alert.alert_type) }}>
                    {alertTypeDisplay(alert.alert_type)}
                  </span>
                </div>
              </td>
              <td style={{ verticalAlign: "top" }}>
                <DecisionCell dec={dec} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------- TODAY ALERTS (last 24 hours) ----------------
function LiveAlertsPage({ alerts, detections, cameraLocationLookup, cameraZoneLookup, decisionByDetection, onViewImage }) {
  const liveAlerts = alerts.filter((a) => withinLastHours(a.created_at, 24));

  return (
    <div>
      <h2 className="page-title">Today Alerts</h2>
      <p className="page-sub" style={{ color: "var(--text)" }}>Alerts from the last 24 hours</p>
      <div className="panel">
        <AlertsTable
          alerts={liveAlerts}
          detections={detections}
          cameraLocationLookup={cameraLocationLookup}
          cameraZoneLookup={cameraZoneLookup}
          decisionByDetection={decisionByDetection}
          onViewImage={onViewImage}
        />
        {liveAlerts.length === 0 && (
          <p style={{ color: "var(--text)", fontSize: 14, marginTop: 8 }}>
            Nothing in the last 24 hours — check All Alerts for the full history.
          </p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("forestSentinelToken") || null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [cameras, setCameras] = useState([]);
  const [detections, setDetections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  const [theme, setTheme] = useState("light");
  const [focusCameraId, setFocusCameraId] = useState(null);
  const [knownClassCount, setKnownClassCount] = useState(null);

  const onOpenMap = (cameraId) => {
    setFocusCameraId(cameraId);
    setActivePage("Map View");
  };

  const onUpdateCamera = async (cameraId, payload) => {
    try {
      const res = await fetch(`${API_URL}/cameras/${cameraId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setCameras((prev) => prev.map((c) => (c.id === cameraId ? updated : c)));
      } else {
        console.error("Failed to update camera", await res.text());
      }
    } catch (err) {
      console.error("Failed to update camera", err);
    }
  };

  const onToggleStatus = async (cameraId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/cameras/${cameraId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCameras((prev) => prev.map((c) => (c.id === cameraId ? updated : c)));
      } else {
        console.error("Failed to update camera status", await res.text());
      }
    } catch (err) {
      console.error("Failed to update camera status", err);
    }
  };

  const onDeleteCamera = async (cameraId) => {
    try {
      const res = await fetch(`${API_URL}/cameras/${cameraId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCameras((prev) => prev.filter((c) => c.id !== cameraId));
        setDetections((prev) => prev.filter((d) => d.camera_id !== cameraId));
        setAlerts((prev) => prev.filter((a) => a.camera_id !== cameraId));
        setDecisions((prev) => prev.filter((x) => x.camera_id !== cameraId));
      } else {
        console.error("Failed to delete camera", await res.text());
      }
    } catch (err) {
      console.error("Failed to delete camera", err);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const fetchData = async (authToken) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    try {
      const [camRes, detRes, alertRes, decRes] = await Promise.all([
        fetch(`${API_URL}/cameras`, { headers }),
        fetch(`${API_URL}/detections`, { headers }),
        fetch(`${API_URL}/alerts`, { headers }),
        fetch(`${API_URL}/decisions`, { headers }),
      ]);

      // Token expired or invalid (e.g. backend restarted) - stop looping
      // on 401s forever and just send the person back to login cleanly.
      if (camRes.status === 401 || detRes.status === 401 || alertRes.status === 401 || decRes.status === 401) {
        localStorage.removeItem("forestSentinelToken");
        setToken(null);
        setCameras([]); setDetections([]); setAlerts([]); setDecisions([]);
        return;
      }

      setCameras(await camRes.json());
      setDetections(await detRes.json());
      setAlerts(await alertRes.json());
      const decData = decRes.ok ? await decRes.json() : [];
      setDecisions(Array.isArray(decData) ? decData : []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData(token);
      fetch(`${API_URL}/model/info`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) setKnownClassCount(data.class_count); })
        .catch(() => {});
      // Auto-refresh so data updates while you're logged in, but does NOT
      // start/stop the simulator automatically - that stays fully manual,
      // either via `python simulate.py` yourself or the Settings page buttons.
      const interval = setInterval(() => fetchData(token), 4000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogin = (accessToken) => {
    localStorage.setItem("forestSentinelToken", accessToken);
    setToken(accessToken);
  };
  const handleLogout = () => {
    localStorage.removeItem("forestSentinelToken");
    setToken(null); setCameras([]); setDetections([]); setAlerts([]); setDecisions([]);
  };

  const cameraLookup = {};
  const cameraCoords = {};
  const cameraZoneLookup = {};
  const cameraLocationLookup = {};
  cameras.forEach((c) => {
    cameraLookup[c.id] = c.name;
    cameraCoords[c.id] = { lat: c.latitude, lng: c.longitude };
    cameraZoneLookup[c.id] = c.zone;
    cameraLocationLookup[c.id] = c.location_name || c.name;
  });

  // each detection's decision, for quick lookup in tables
  const decisionByDetection = {};
  decisions.forEach((d) => { if (d.detection_id != null) decisionByDetection[d.detection_id] = d; });

  if (!token) return (<><GlobalTheme /><LoginPage onLogin={handleLogin} /></>);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard": return <Dashboard cameras={cameras} detections={detections} alerts={alerts} cameraLookup={cameraLookup} cameraZoneLookup={cameraZoneLookup} cameraLocationLookup={cameraLocationLookup} decisionByDetection={decisionByDetection} onNavigate={setActivePage} onViewImage={setViewingImage} onOpenMap={onOpenMap} knownClassCount={knownClassCount} />;
      case "Detect Animals": return <IdentifyAnimal token={token} />;
      case "Today Alerts": return (
        <LiveAlertsPage
          alerts={alerts}
          detections={detections}
          cameraLocationLookup={cameraLocationLookup}
          cameraZoneLookup={cameraZoneLookup}
          decisionByDetection={decisionByDetection}
          onViewImage={setViewingImage}
        />
      );
      case "All Alerts": return (
        <AlertsPage
          alerts={alerts}
          title="All Alerts"
          detections={detections}
          cameraLookup={cameraLookup}
          cameraZoneLookup={cameraZoneLookup}
          cameraLocationLookup={cameraLocationLookup}
          decisionByDetection={decisionByDetection}
          cameras={cameras}
          onViewImage={setViewingImage}
        />
      );
      case "AI Assistant": return <AssistantChat token={token} />;
      case "Map View": return <MapView cameras={cameras} focusCameraId={focusCameraId} />;
      case "Devices": return <Devices cameras={cameras} onOpenMap={onOpenMap} onUpdateCamera={onUpdateCamera} onToggleStatus={onToggleStatus} onDeleteCamera={onDeleteCamera} />;
      case "Users": return <Users onLogout={handleLogout} />;
      case "Add Camera": return <RegisterCamera token={token} onRegistered={() => fetchData(token)} />;
      case "Settings": return <Settings theme={theme} toggleTheme={toggleTheme} token={token} onDataCleared={() => { setDetections([]); setAlerts([]); setDecisions([]); fetchData(token); }} />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalTheme />
      <div className="app-shell">
        <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} />
        <div className="main-area">{renderPage()}</div>
      </div>
      <ImageModal detection={viewingImage} onClose={() => setViewingImage(null)} />
    </>
  );
}
