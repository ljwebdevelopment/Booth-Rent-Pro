import { getState, setState } from '../uiStore.js';

export function renderAuthView(root, handlers) {
  const state = getState();
  const isSignUpMode = state.authViewMode === 'signup';

  root.innerHTML = `
    <div class="auth-card">
      <h1 class="auth-title">Welcome to BoothRent Pro</h1>

      <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button type="button" class="auth-tab ${!isSignUpMode ? 'active' : ''}" data-mode="signin">Sign In</button>
        <button type="button" class="auth-tab ${isSignUpMode ? 'active' : ''}" data-mode="signup">Create Account</button>
      </div>

      <p class="auth-error ${state.authError ? '' : 'hidden'}">${state.authError || ''}</p>

      <form id="auth-form" class="form-grid">
        <label>
          Email
          <input class="form-input" type="email" name="email" required />
        </label>

        <label>
          Password
          <input class="form-input" type="password" name="password" required minlength="6" />
        </label>

        <div class="signup-fields ${isSignUpMode ? '' : 'hidden'}">
          <div class="form-grid">
            <label>
              Business Name
              <input class="form-input" type="text" name="businessName" ${isSignUpMode ? 'required' : ''} />
            </label>
            <label>
              Phone
              <input class="form-input" type="tel" name="phone" />
            </label>
            <label>
              Address 1
              <input class="form-input" type="text" name="address1" />
            </label>
            <label>
              City
              <input class="form-input" type="text" name="city" />
            </label>
            <label>
              State
              <input class="form-input" type="text" name="state" />
            </label>
            <label>
              Zip
              <input class="form-input" type="text" name="zip" />
            </label>
          </div>
        </div>

        <button class="btn btn-primary" type="submit" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? 'Please wait...' : isSignUpMode ? 'Create Account' : 'Sign In'}
        </button>

        <button type="button" class="auth-switch" id="auth-switch-link">
          ${isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Create Account'}
        </button>
      </form>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setState({
        authViewMode: tabButton.dataset.mode,
        authError: ''
      });
    });
  });

  root.querySelector('#auth-switch-link')?.addEventListener('click', () => {
    setState({
      authViewMode: isSignUpMode ? 'signin' : 'signup',
      authError: ''
    });
  });

  root.querySelector('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || '').trim(),
      businessProfile: {
        businessName: String(formData.get('businessName') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        address1: String(formData.get('address1') || '').trim(),
        city: String(formData.get('city') || '').trim(),
        state: String(formData.get('state') || '').trim(),
        zip: String(formData.get('zip') || '').trim()
      }
    };

    if (isSignUpMode && !payload.businessProfile.businessName) {
      setState({ authError: 'Business Name is required to create your account.' });
      return;
    }

    await handlers.onSubmit(payload);
  });
}
