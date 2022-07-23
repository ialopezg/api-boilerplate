import { mock, MockProxy } from 'jest-mock-extended';

import { AuthenticationException } from '../exceptions';
import { FacebookApi } from '../interfaces';
import { FacebookAuthService } from '../services/facebook-auth.service';
import { FacebookRepository } from '../repositories';

describe('FacebookAuthService', () => {
  let api: MockProxy<FacebookApi>;
  let auth: FacebookAuthService;
  let repo: FacebookRepository;
  const token = 'token';

  beforeEach(() => {
    api = mock();
    api.loadUser.mockResolvedValue({
      name: 'any_facebook_name',
      email: 'any_facebook_email',
      fid: 'any_facebook_id',
    });
    repo = mock();
    auth = new FacebookAuthService(api, repo);
  });

  describe('FacebookApi', () => {
    it('should call `load()` with correct params', async () => {
      await auth.perform({ token });

      expect(api.loadUser).toHaveBeenCalledWith({ token });
      expect(api.loadUser).toHaveBeenCalledTimes(1);
    });

    it('should return `AuthenticationError` when `load()` returns undefined', async () => {
      api.loadUser.mockResolvedValueOnce(undefined);
      const authResult = await auth.perform({ token });

      expect(authResult).toEqual(new AuthenticationException());
    });
  });

  describe('FacebookRepository', () => {
    it('should call load when `FacebookAuthService.perform()` returns data', async () => {
      await auth.perform({ token });

      expect(repo.load).toHaveBeenCalledWith({ email: 'any_facebook_email' });
      expect(repo.load).toHaveBeenCalledTimes(1);
    });

    it('should call `create()` when `FacebookAuthService.perform()` returns undefined', async () => {
      await auth.perform({ token });

      expect(repo.create).toHaveBeenCalledWith({
        fid: 'any_facebook_id',
        name: 'any_facebook_name',
        email: 'any_facebook_email',
      });
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('should call update() when load() returns data', async () => {
      const load = jest.fn();
      repo.load = load;
      load.mockResolvedValueOnce({
        id: 'any_id',
        name: 'any_name',
      });

      await auth.perform({ token });

      expect(repo.update).toHaveBeenCalledWith({
        id: 'any_id',
        name: 'any_name',
        fid: 'any_facebook_id',
      });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });
  });
});
