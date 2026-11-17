#!/usr/bin/env python3
"""Kế hoạch bài đọc của Studio cho một ngày, theo lộ trình studio/data/curriculum.json.

    python3 studio/tools/plan.py 2026-11-25          # in JSON kế hoạch
    python3 studio/tools/plan.py 2026-11-25 --text   # bản tóm tắt dễ đọc

Mỗi ngày 4 bài: 1·A nền tảng (lớn), 2·B đời sống vận hành thế nào (nhỏ),
3·C con người & ứng xử (lớn), 4·D tư duy & ôn tập (nhỏ).
Thứ Tư bài 4 là ôn giãn cách; Chủ nhật bài 1 tổng kết tuần (tuần 4: tổng kết chặng),
bài 3 tình huống tuần, bài 4 tự kiểm tra tuần (tuần 4: tự kiểm tra chặng).
Chỉ đọc dữ liệu, không ghi gì.
"""
import datetime as dt, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'studio', 'data')
WD = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']
STAGE_DAYS, STAGES, CROSS_DAYS = 28, 12, 28
YEAR_DAYS = STAGE_DAYS * STAGES + CROSS_DAYS          # 364 ngày = 52 tuần

ROLE_GUIDE = {
 'new': 'Bài mới. Viết theo đề gợi ý (được đặt lại tên cho hay hơn nhưng giữ đúng nội dung); không có đề gợi ý thì tự chọn một đề mới thuộc chủ đề tuần, khác hẳn các bài đã có trong this_week và index.json.',
 'review': 'Ôn giãn cách. `check` có 9 câu, câu nào cũng có `from` = id bài gốc: 3 câu từ sources.this_week, 3 từ sources.last_week, 2 từ sources.prev_stage, 1 từ sources.older (nhóm nào trống thì lấy bù từ nhóm gần hơn). Mở file bài gốc để câu hỏi và đáp án đúng với bài. Câu hỏi bắt nhớ lại ý chính, vì sao, khi nào dùng — không hỏi chi tiết vụn. `body` ngắn 150–300 từ: hôm nay ôn những mạch nào, ôn xong thì bài nào nên đọc lại.',
 'week': 'Tổng kết tuần. Kể lại cả tuần thành một câu chuyện liền mạch, nối các bài trong sources.this_week (nhắc tên từng bài), chỉ ra mạch A/B/C/D bổ sung cho nhau ở đâu. Cuối `body` có mục "## Sơ đồ ý" dạng danh sách lồng 2–3 tầng. `connect` liệt kê các bài trong tuần. `check` 3 câu lớn.',
 'stage': 'Tổng kết chặng (thay tổng kết tuần ở Chủ nhật tuần 4). Bản đồ cả chặng: 4 tuần, mỗi tuần điều cốt lõi nhất; các chỗ nối sang các chặng trước (sources.prev_stages_titles); điều gì nên mang theo sang chặng sau. Cuối `body` có "## Sơ đồ ý" dạng danh sách lồng. `connect` 6–10 bài tiêu biểu của chặng. `check` 4 câu lớn.',
 'case': 'Tình huống tuần. Một tình huống thật, cụ thể, đặt trong đời sống của một người đi làm ở cơ quan nhà nước ở Việt Nam: có bối cảnh, nhân vật, lời thoại. Tình huống buộc phải dùng kiến thức của nhiều bài trong tuần. Đưa 2–3 cách xử lý, phân tích được – mất từng cách, rồi gợi ý cách hợp lý nhất và vì sao. `connect` chỉ các bài trong tuần được dùng tới. `check` 3 câu.',
 'quiz': 'Tự kiểm tra tuần. `check` có 10 câu, câu nào cũng có `from`: 7 câu từ sources.this_week (mỗi bài ít nhất một câu nếu đủ), 3 câu từ sources.last_week hoặc sources.prev_stage. `body` chỉ 2–3 câu: cố trả lời trong đầu trước, câu nào quên thì bấm đọc lại bài gốc.',
 'stagequiz': 'Tự kiểm tra chặng. `check` có 15 câu, câu nào cũng có `from`: 12 câu trải đều 4 tuần của chặng (sources.stage), 3 câu từ các chặng trước (sources.prev_stage, sources.older). `body` 2–3 câu.',
 'year': 'Tổng kết năm. Tấm bản đồ của cả 12 chặng: mỗi chặng một đoạn ngắn, các đường nối lớn giữa các chặng, và những câu hỏi để mang sang năm sau. `connect` 12 bài tổng kết chặng nếu có. `check` 6 câu lớn.',
}


def load(name, default=None):
    try:
        with open(os.path.join(DATA, name), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def d(s):
    return dt.date.fromisoformat(s)


def items_between(items, a, b, roles=('new',)):
    """bài có ngày trong [a, b] (cả hai đầu), vai trò thuộc roles (bài cũ chưa có role coi như 'new')."""
    out = []
    for it in items:
        try:
            x = d(it.get('date', ''))
        except ValueError:
            continue
        if a <= x <= b and (it.get('role') or 'new') in roles:
            out.append({k: it.get(k) for k in ('id', 'date', 'title', 'track', 'topic') if it.get(k)})
    return out


def plan(date_s):
    cur = load('curriculum.json')
    if not cur:
        sys.exit('thiếu studio/data/curriculum.json')
    idx = (load('reads/index.json', {}) or {}).get('items', [])
    D = d(date_s)
    dow = D.weekday()
    monday = D - dt.timedelta(days=dow)
    tr = cur['tracks']
    intro0, s1 = d(cur['intro_start']), d(cur['stage1_start'])
    P = {'date': date_s, 'weekday': WD[dow], 'phase': None, 'level': 1, 'stage': None, 'week': None,
         'stage_title': None, 'week_title': None, 'label': None}

    seeds, langA, roles = {}, 'vi', {'A': 'new', 'B': 'new', 'C': 'new', 'D': 'new'}
    if D < intro0:
        P['phase'] = 'before'
        P['label'] = 'Trước lộ trình'
    elif D < s1:
        P['phase'] = 'intro'
        P['week_title'] = cur['intro']['title']
        P['label'] = cur['intro']['title']
        day = cur['intro']['days'].get(date_s, {})
        seeds = {k: day.get(k) for k in 'ABCD'}
        if dow == 6:
            roles.update(A='week', C='case', D='quiz')
    else:
        n = (D - s1).days
        P['level'] = 1 + n // YEAR_DAYS
        n %= YEAR_DAYS
        if n < STAGE_DAYS * STAGES:
            si, wi = n // STAGE_DAYS, (n % STAGE_DAYS) // 7
            st = cur['stages'][si]
            wk = st['weeks'][wi]
            P.update(phase='stage', stage=si + 1, week=wi + 1, stage_title=st['title'], week_title=wk['title'])
            P['label'] = f"Chặng {si + 1}/12 · {st['title']} · Tuần {wi + 1}/4: {wk['title']}"
            langA = wk.get('langA', 'vi')
            pos = {'A': dow if dow <= 5 else None, 'B': dow, 'C': dow if dow <= 5 else None,
                   'D': {0: 0, 1: 1, 3: 2, 4: 3, 5: 4}.get(dow)}
            for k in 'ABCD':
                lst = wk.get(k, [])
                i = pos[k]
                seeds[k] = lst[i] if (i is not None and i < len(lst) and P['level'] == 1) else None
                P.setdefault('later_seeds', {})[k] = lst[(i + 1 if i is not None else len(lst)):] if P['level'] == 1 else []
            if dow == 2:
                roles['D'] = 'review'
            if dow == 6:
                roles.update(A='stage' if wi == 3 else 'week', C='case', D='stagequiz' if wi == 3 else 'quiz')
        else:
            ci = n - STAGE_DAYS * STAGES
            cw = ci // 7
            P.update(phase='cross', week=cw + 1, week_title=cur['cross']['title'])
            P['label'] = f"{cur['cross']['title']} · Tuần {cw + 1}/4"
            if dow <= 5:
                pr = cur['cross']['pairs'][cw * 6 + dow]
                a, b = pr['stages']
                names = [cur['stages'][a - 1]['title'], cur['stages'][b - 1]['title']]
                P['cross_pair'] = {'stages': [a, b], 'titles': names, 'hint': pr['hint']}
                seeds = {'A': f"Giao thoa chặng {a} × chặng {b}: {pr['hint']}",
                         'B': f"Một hiện tượng đời thường giải thích bằng cả hai chặng {a} ({names[0]}) và {b} ({names[1]})",
                         'C': f"Một tình huống ứng xử cần dùng cả hai chặng {a} và {b}: {pr['hint']}",
                         'D': f"A thinking tool that links stage {a} ({names[0]}) and stage {b} ({names[1]})"}
            if dow == 2:
                roles['D'] = 'review'
            if dow == 6:
                roles.update(A='year' if cw == 3 else 'week', C='case', D='quiz')
                seeds['B'] = 'Bài nhẹ: một câu hỏi đời thường nối các cặp chặng của tuần này'

    if P['level'] > 1 and P['phase'] == 'stage':
        P['level_note'] = (f"Năm thứ {P['level']}: đi lại chặng này ở tầng sâu hơn — đề mới, góc nhìn mới, "
                           "không lặp các bài năm trước (tra index.json theo stage/week).")

    slots = []
    for n_, k in enumerate('ABCD', 1):
        role = roles[k]
        if k == 'A':
            lang = 'vi' if role != 'new' or P['phase'] in ('intro', 'cross', 'before') else langA
        elif k == 'D':
            lang = 'en' if role == 'new' else 'vi'
        else:
            lang = 'vi'
        kind = tr[k]['kind'] if role == 'new' else ('big' if role in ('week', 'stage', 'case', 'year') else 'small')
        minutes = tr[k]['minutes'] if role == 'new' else ([15, 20] if kind == 'big' else [8, 12])
        sid = f'{date_s}-{n_}'
        slots.append({'n': n_, 'id': sid, 'file': f'studio/data/reads/{sid}.json',
                      'exists': os.path.exists(os.path.join(DATA, 'reads', sid + '.json')),
                      'track': k, 'track_name': tr[k]['name'], 'track_desc': tr[k]['desc'],
                      'role': role, 'role_name': cur['roles'][role], 'guide': ROLE_GUIDE[role],
                      'kind': kind, 'lang': lang, 'minutes': minutes,
                      'words': tr[k]['words'] if role == 'new' else None,
                      'seed': seeds.get(k) if role == 'new' else None})
    P['slots'] = slots

    # nguồn để ôn, nối bài
    y = D - dt.timedelta(days=1)
    src = {'this_week': items_between(idx, monday, y),
           'last_week': items_between(idx, monday - dt.timedelta(days=7), monday - dt.timedelta(days=1)),
           'prev_stage': items_between(idx, monday - dt.timedelta(days=28), monday - dt.timedelta(days=22)),
           'older': items_between(idx, monday - dt.timedelta(days=84), monday - dt.timedelta(days=78))}
    if not src['older']:
        src['older'] = items_between(idx, dt.date(2000, 1, 1), monday - dt.timedelta(days=56))[-8:]
    if P['phase'] == 'stage':
        st0 = s1 + dt.timedelta(days=(P['level'] - 1) * YEAR_DAYS + (P['stage'] - 1) * STAGE_DAYS)
        src['stage'] = items_between(idx, st0, y)
        src['prev_stages_titles'] = [s['title'] for s in cur['stages'][:P['stage'] - 1]]
    P['sources'] = src
    P['recent'] = [{k: it.get(k) for k in ('id', 'date', 'title', 'track', 'topic') if it.get(k)} for it in idx[-40:]]
    return P


def text(P):
    out = [f"{P['date']} · {P['weekday']} · {P['label']}"]
    if P.get('cross_pair'):
        out.append('  giao thoa: ' + P['cross_pair']['hint'])
    if P.get('level_note'):
        out.append('  ' + P['level_note'])
    for s in P['slots']:
        out.append(f"  {s['n']}. {s['track']} · {s['track_name']} · {s['role_name']} · {s['kind']} · {s['lang']} · "
                   f"{s['minutes'][0]}–{s['minutes'][1]} phút{' · ĐÃ CÓ' if s['exists'] else ''}")
        if s['seed']:
            out.append('     đề: ' + s['seed'])
    for k, v in P['sources'].items():
        if v and k != 'prev_stages_titles':
            out.append(f'  nguồn {k}: {len(v)} bài')
    return '\n'.join(out)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        os.environ['TZ'] = 'Asia/Ho_Chi_Minh'
        args = [(dt.datetime.utcnow() + dt.timedelta(hours=7)).date().isoformat()]
    p = plan(args[0])
    print(text(p) if '--text' in sys.argv else json.dumps(p, ensure_ascii=False, indent=1))
