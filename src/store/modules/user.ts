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
