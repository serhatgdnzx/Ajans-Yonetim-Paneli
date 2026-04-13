(function () {
  function mapIcon(t) {
    if (t === 'success') return 'success';
    if (t === 'error') return 'error';
    if (t === 'info') return 'info';
    return 'warning';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('swal-flash');
    if (el && typeof Swal !== 'undefined') {
      try {
        var f = JSON.parse(el.textContent);
        if (f && f.message) {
          Swal.fire({
            icon: mapIcon(f.type),
            title: f.type === 'error' ? 'Hata' : f.type === 'success' ? 'Tamam' : 'Bilgi',
            text: f.message,
            confirmButtonColor: '#6366f1',
            timer: f.type === 'success' ? 2800 : undefined,
            timerProgressBar: !!f.type && f.type === 'success',
          });
        }
      } catch (e) {}
    }

    document.querySelectorAll('form[data-swal-delete]').forEach(function (form) {
      form.addEventListener('submit', function onSubmit(e) {
        e.preventDefault();
        var title = form.getAttribute('data-swal-title') || 'Silmek istediğinize emin misiniz?';
        Swal.fire({
          icon: 'warning',
          title: title,
          showCancelButton: true,
          confirmButtonText: 'Evet, sil',
          cancelButtonText: 'İptal',
          confirmButtonColor: '#f43f5e',
          cancelButtonColor: '#64748b',
        }).then(function (r) {
          if (r.isConfirmed) {
            form.removeEventListener('submit', onSubmit);
            form.submit();
          }
        });
      });
    });
  });
})();
