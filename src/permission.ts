import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import router from '@/router';
import i18n from '@/i18n';

NProgress.configure({ showSpinner: false });

const whiteList = ['/login'];

router.beforeEach((to, _from, next) => {
  NProgress.start();
  if (to.meta?.title) {
    // 动态 key 场景下 vue-i18n 泛型推导会过深，这里收窄为普通函数签名
    const translate = (i18n.global as unknown as { t: (key: string) => string }).t;
    document.title = `${translate(to.meta.title)} - SamWaf`;
  }
  const token = localStorage.getItem('access_token');
  if (token) {
    if (to.path === '/login') {
      next({ path: '/' });
    } else {
      next();
    }
  } else if (whiteList.includes(to.path)) {
    next();
  } else {
    next(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});

router.afterEach(() => {
  NProgress.done();
});
