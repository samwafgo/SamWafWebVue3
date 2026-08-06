import { defineStore } from 'pinia';
import { loginapi, logoutapi, type LoginParams } from '@/apis/login';
import { CODE } from '@/utils/request';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('access_token') || '',
    account: localStorage.getItem('current_account') || '',
  }),
  getters: {
    isLogin: (state) => !!state.token,
  },
  actions: {
    async login(params: LoginParams) {
      const res = await loginapi(params);
      if (res.code === CODE.REQUEST_SUCCESS) {
        this.token = res.data.access_token;
        this.account = params.login_account;
        localStorage.setItem('access_token', this.token);
        localStorage.setItem('current_account', this.account);
        // 登录来源提醒：进入布局后由 layouts/index.vue 在右下角弹出。
        // 在这里就存下来（而不是等进系统再查接口），是因为「上次登录」在本次登录写库后就被覆盖了，
        // 只有登录响应这一刻拿得到。放 sessionStorage：关掉标签页就没了，不会下次打开还弹旧的。
        if (res.data.login_notice) {
          sessionStorage.setItem('login_notice', JSON.stringify(res.data.login_notice));
        }
      }
      return res;
    },
    async logout() {
      try {
        await logoutapi();
      } finally {
        this.token = '';
        this.account = '';
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_account');
      }
    },
  },
});
