const VbsTest = function() {
  const self = Reflect.construct(HTMLElement, [], new.target || VbsTest);
  Object.defineProperty(self, '_isOpen', { enumerable: false, writable: true, value: false });
  return self;
} as any;

VbsTest.prototype = Object.create(HTMLElement.prototype);
VbsTest.prototype.constructor = VbsTest;

VbsTest.prototype.connectedCallback = function() {
  console.log('connected');
};

customElements.define('vbs-test', VbsTest);
