module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapper: {
    "\\.(css|scss|sass)$": "identity-obj-proxy",
    "\\.(png|jpg|jpeg|gif|svg|ttf|woff|woff2)$": "<rootDir>/src/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx}",
    "<rootDir>/src/**/*.test.{js,jsx}",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/index.jsx",
    "!src/**/__mocks__/**",
  ],
};
