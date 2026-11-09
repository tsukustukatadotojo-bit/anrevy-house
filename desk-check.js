/* Điện thoại đang mở trang ở chế độ "Trang web cho máy tính" (trình duyệt bỏ qua bản điện thoại)
   → hiện dòng nhắc cách tắt. Không làm gì trên máy tính hay khi đang ở bản điện thoại bình thường. */
(function () {
  try {
    var touch = (navigator.maxTouchPoints || 0) > 0;
    var sMin = Math.min(screen.width, screen.height), sMax = Math.max(screen.width, screen.height);
    if (!touch || !sMin || sMin >= 600) return;                       // chỉ điện thoại
    try { if (sessionStorage.getItem('desk-hint') === '0') return; } catch (e) {}
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent);
    function show() {
      if (document.getElementById('deskHint') || !document.body) return;
      var land = matchMedia('(orientation: landscape)').matches, devW = land ? sMax : sMin;
      if (!(innerWidth >= 900 && innerWidth > devW * 1.04)) return;    // trang đang dàn trang rộng như máy tính
      var k = Math.max(1, innerWidth / devW), px = function (v) { return Math.round(v * k) + 'px'; };
      var d = document.createElement('div');
      d.id = 'deskHint'; d.setAttribute('role', 'alert');
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:' + px(12) + ' ' + px(16) + ';background:#1a0b04;color:#fff1d6;border-top:' + px(3) + ' solid #e2b84e;font:' + px(15) + '/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 -6px 20px rgba(0,0,0,.5)';
      d.innerHTML = '<b style="color:#e2b84e">Trang đang mở ở chế độ máy tính</b><br>' +
        (ios ? 'Để xem bản điện thoại: trong Safari bấm <b>aA</b> → <b>Yêu cầu trang web cho thiết bị di động</b>. Nếu đã cài vào màn hình chính: vào <b>Cài đặt → Safari</b>, tắt <b>Yêu cầu trang web cho máy tính</b>, rồi mở lại app.'
             : 'Để xem bản điện thoại: trong Chrome bấm <b>⋮</b> và bỏ chọn <b>Trang web cho máy tính</b>. Nếu đã cài app: mở Chrome → <b>⋮ → Cài đặt → Cài đặt trang web → Trang web cho máy tính</b>, tắt cho trang này, rồi mở lại app.') +
        ' <button type="button" style="margin-left:' + px(8) + ';padding:' + px(4) + ' ' + px(12) + ';font:inherit;font-weight:700;border:0;border-radius:' + px(8) + ';background:#e2b84e;color:#1a0b04">Đã hiểu</button>';
      d.querySelector('button').onclick = function () { d.remove(); try { sessionStorage.setItem('desk-hint', '0'); } catch (e) {} };
      document.body.appendChild(d);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  } catch (e) {}
})();
