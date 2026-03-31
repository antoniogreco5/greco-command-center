import { NextResponse } from "next/server";

const TOKEN = process.env.MONDAY_API_TOKEN;
const API = "https://api.monday.com/v2";
const EXPIRED_BOARD = 18391858336;
const FSBO_BOARD = 18391858341;
const CONTENT_BOARD = 18391858356;

async function mondayQuery(query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function getExpiredData() {
  let allItems = [];
  let cursor = null;
  // First page
  const q1 = `query { boards(ids: [${EXPIRED_BOARD}]) { items_page(limit: 500) { cursor items { id name created_at updated_at column_values(ids: ["last_list_price","status","follow_up_status__1","owner_name","phone__wireless_","email","exp_uw_date"]) { id text value } } } } }`;
  const d1 = await mondayQuery(q1);
  const page1 = d1.boards[0].items_page;
  allItems = page1.items;
  cursor = page1.cursor;
  // Additional pages
  while (cursor) {
    const qN = `query($cursor: String!) { next_items_page(limit: 500, cursor: $cursor) { cursor items { id name created_at updated_at column_values(ids: ["last_list_price","status","follow_up_status__1","owner_name","phone__wireless_","email","exp_uw_date"]) { id text value } } } }`;
    const dN = await mondayQuery(qN, { cursor });
    allItems = allItems.concat(dN.next_items_page.items);
    cursor = dN.next_items_page.cursor;
  }
  return allItems;
}

async function getFSBOData() {
  const q = `query { boards(ids: [${FSBO_BOARD}]) { items_page(limit: 500) { items { id name column_values(ids: ["follow_up_status","_list_price","owner_name","phone","email"]) { id text value } } } } }`;
  const d = await mondayQuery(q);
  return d.boards[0].items_page.items;
}

async function getContentData() {
  const q = `query { boards(ids: [${CONTENT_BOARD}]) { items_page(limit: 100) { items { id name column_values(ids: ["creative_status","dup__of_dup__of_dup__of_status","date","status_1"]) { id text value } } } } }`;
  const d = await mondayQuery(q);
  return d.boards[0].items_page.items;
}

function parseCol(item, colId) {
  const col = item.column_values.find((c) => c.id === colId);
  return col?.text || null;
}

function parsePrice(item, colId) {
  const txt = parseCol(item, colId);
  return txt ? parseFloat(txt.replace(/[^0-9.]/g, "")) || 0 : 0;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / 86400000);
}

export async function GET() {
  if (!TOKEN) return NextResponse.json({ error: "No Monday API token" }, { status: 500 });

  try {
    const [expiredItems, fsboItems, contentItems] = await Promise.all([
      getExpiredData(), getFSBOData(), getContentData(),
    ]);

    // Process expired
    const expired = { total: 0, emailed: 0, planToCall: 0, communicating: 0, texted: 0, noResponse: 0, notInterested: 0, relisted: 0, untouched: 0, leads: [] };
    const skipTraceNeeded = [];
    const relistCheck = [];

    for (const item of expiredItems) {
      if (item.name === "TEST" || item.name === "Test") continue;
      expired.total++;
      const followUp = parseCol(item, "follow_up_status__1");
      const price = parsePrice(item, "last_list_price");
      const owner = parseCol(item, "owner_name");
      const phone = parseCol(item, "phone__wireless_");
      const email = parseCol(item, "email");
      const expDate = parseCol(item, "exp_uw_date");
      const status = parseCol(item, "status");
      const daysExp = daysSince(expDate);

      if (followUp === "Emailed") expired.emailed++;
      else if (followUp === "Plan to Call") expired.planToCall++;
      else if (followUp === "Communicating") expired.communicating++;
      else if (followUp === "Texted") expired.texted++;
      else if (followUp === "No Response Yet") expired.noResponse++;
      else if (followUp === "Not Interested") expired.notInterested++;
      else if (followUp === "Relisted Already") expired.relisted++;
      else expired.untouched++;

      // Track leads with follow-up status set
      if (followUp && followUp !== "Not Interested" && followUp !== "Relisted Already" && followUp !== "Do Not Call") {
        expired.leads.push({
          id: item.id, addr: item.name, price, owner, phone, email,
          status: followUp, daysExpired: daysExp, mlsStatus: status,
          hasEmail: !!email, hasPhone: !!phone,
        });
      }

      // Leads that need skip tracing (in outreach but no email)
      if (followUp && ["Emailed","Plan to Call"].includes(followUp) && !email && price > 0) {
        skipTraceNeeded.push({ addr: item.name, price, owner });
      }

      // Leads expired 7+ days with no follow up — check if relisted
      if (!followUp && status === "X" && daysExp && daysExp >= 7 && daysExp <= 60 && price >= 500000) {
        relistCheck.push({ addr: item.name, price, daysExpired: daysExp });
      }
    }

    // Sort leads by price desc
    expired.leads.sort((a, b) => b.price - a.price);
    relistCheck.sort((a, b) => b.price - a.price);

    // Enrichment stats
    const withEmail = expired.leads.filter(l => l.hasEmail).length;
    const withPhone = expired.leads.filter(l => l.hasPhone).length;
    expired.enrichment = {
      totalActive: expired.leads.length,
      withEmail, withPhone,
      missingEmail: expired.leads.length - withEmail,
      emailPct: expired.leads.length > 0 ? Math.round((withEmail / expired.leads.length) * 100) : 0,
    };

    // Process FSBO
    const fsbo = { total: 0, active: 0, pending: 0, offMarket: 0, sold: 0, noOutreach: 0 };
    for (const item of fsboItems) {
      if (item.name === "test" || item.name === "TEST") continue;
      fsbo.total++;
      const status = parseCol(item, "follow_up_status");
      if (status === "Active Listing") { fsbo.active++; fsbo.noOutreach++; }
      else if (status === "Pending") fsbo.pending++;
      else if (status === "Off market") fsbo.offMarket++;
      else if (status === "Sold") fsbo.sold++;
      else if (status === "Emailed") { fsbo.active++; }
      else fsbo.active++;
    }

    // Process content
    const content = { total: 0, wip: 0, items: [] };
    for (const item of contentItems) {
      if (item.name === "TEST") continue;
      content.total++;
      const creativeStatus = parseCol(item, "creative_status");
      const type = parseCol(item, "dup__of_dup__of_dup__of_status");
      const due = parseCol(item, "date");
      const workStatus = parseCol(item, "status_1");
      const isWip = workStatus === "Working on it";
      if (isWip) content.wip++;
      content.items.push({ title: item.name, type: type || "Post", due, wip: isWip, status: creativeStatus });
    }
    content.items.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

    // Generate daily tasks
    const today = new Date();
    const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][today.getDay()];
    const tasks = [];

    if (expired.communicating > 0) {
      tasks.push({ priority: "critical", task: `CALL NOW: ${expired.communicating} lead(s) responding`, detail: "Check Monday → Communicating status → call immediately", category: "outreach" });
    }

    if (skipTraceNeeded.length > 0) {
      const top5 = skipTraceNeeded.sort((a,b) => b.price - a.price).slice(0, 5);
      tasks.push({ priority: "high", task: `Skip trace ${skipTraceNeeded.length} leads on BatchLeads`, detail: `Top: ${top5.map(l => l.addr.split(",")[0]).join(", ")}`, category: "data" });
    }

    if (relistCheck.length > 0) {
      const top5 = relistCheck.slice(0, 5);
      tasks.push({ priority: "medium", task: `Check ${relistCheck.length} leads for relists on MLS`, detail: `Highest value: ${top5.map(l => l.addr.split(",")[0]).join(", ")}`, category: "research" });
    }

    if (fsbo.noOutreach > 0) {
      tasks.push({ priority: "medium", task: `${fsbo.noOutreach} FSBOs need outreach`, detail: "Build FSBO email sequence for VA to execute", category: "outreach" });
    }

    const upcomingContent = content.items.filter(c => {
      if (!c.due) return false;
      const dueDate = new Date(c.due + "T00:00:00");
      const diff = (dueDate - today) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    if (upcomingContent.length > 0) {
      tasks.push({ priority: "medium", task: `${upcomingContent.length} content piece(s) due this week`, detail: upcomingContent.map(c => c.title).join(", "), category: "content" });
    }

    if (dayName === "Mon") {
      tasks.push({ priority: "medium", task: "Weekly lead scoring — pick next outreach batch", detail: `${expired.untouched} untouched leads available for next wave`, category: "planning" });
    }

    if (dayName === "Fri") {
      tasks.push({ priority: "low", task: "Weekly pipeline review", detail: `Review all ${expired.leads.length} active leads, update statuses, flag stale ones`, category: "planning" });
    }

    return NextResponse.json({
      lastSync: new Date().toISOString(),
      expired, fsbo, content, tasks, skipTraceNeeded,
      relistCheck: relistCheck.slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
