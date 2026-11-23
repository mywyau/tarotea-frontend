// Older clients may still poll this endpoint until their next page load.
export default defineEventHandler(() => ({ currentUsers: null }));
