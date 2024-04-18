import { makeCompile } from './_utils'
import { transformChildren, transformElement, transformVModel } from '../../src'
import { BindingTypes, DOMErrorCodes } from '@vue/compiler-dom'

const compileWithVModel = makeCompile({
  nodeTransforms: [transformElement, transformChildren],
  directiveTransforms: {
    model: transformVModel,
  },
})

describe('compiler: vModel transform', () => {
  test('should support simple expression', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<input v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelText')
  })

  test('should support input (text)', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<input type="text" v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelText')
  })

  test('should support input (radio)', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<input type="radio" v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelRadio')
  })

  test('should support input (checkbox)', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<input type="checkbox" v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelCheckbox')
  })

  test('should support select', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<select v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelSelect')
  })

  test('should support textarea', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<textarea v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelText')
  })

  test('should support input (dynamic type)', () => {
    const { code, vaporHelpers } = compileWithVModel(
      '<input :type="foo" v-model="model" />',
    )
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('vModelDynamic')
  })

  test('should support w/ dynamic v-bind', () => {
    const root1 = compileWithVModel('<input v-bind="obj" v-model="model" />')
    expect(root1.code).toMatchSnapshot()
    expect(root1.vaporHelpers).toContain('vModelDynamic')

    const root2 = compileWithVModel(
      '<input v-bind:[key]="val" v-model="model" />',
    )
    expect(root2.code).toMatchSnapshot()
    expect(root2.vaporHelpers).toContain('vModelDynamic')
  })

  describe('errors', () => {
    test('invalid element', () => {
      const onError = vi.fn()
      compileWithVModel('<span v-model="model" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: DOMErrorCodes.X_V_MODEL_ON_INVALID_ELEMENT,
        }),
      )
    })

    test('plain elements with argument', () => {
      const onError = vi.fn()
      compileWithVModel('<input v-model:value="model" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: DOMErrorCodes.X_V_MODEL_ARG_ON_ELEMENT,
        }),
      )
    })

    // TODO: component
    test.fails('should allow usage on custom element', () => {
      const onError = vi.fn()
      const root = compileWithVModel('<my-input v-model="model" />', {
        onError,
        isCustomElement: tag => tag.startsWith('my-'),
      })
      expect(root.helpers).toContain('vModelText')
      expect(onError).not.toHaveBeenCalled()
    })

    test('should raise error if used file input element', () => {
      const onError = vi.fn()
      compileWithVModel(`<input type="file" v-model="test"/>`, {
        onError,
      })
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: DOMErrorCodes.X_V_MODEL_ON_FILE_INPUT_ELEMENT,
        }),
      )
    })

    test('should error on dynamic value binding alongside v-model', () => {
      const onError = vi.fn()
      compileWithVModel(`<input v-model="test" :value="test" />`, {
        onError,
      })
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: DOMErrorCodes.X_V_MODEL_UNNECESSARY_VALUE,
        }),
      )
    })

    // #3596
    test('should NOT error on static value binding alongside v-model', () => {
      const onError = vi.fn()
      compileWithVModel(`<input v-model="test" value="test" />`, {
        onError,
      })
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('modifiers', () => {
    test('.number', () => {
      const { code } = compileWithVModel('<input v-model.number="model" />')

      expect(code).toMatchSnapshot()
    })

    test('.trim', () => {
      const { code } = compileWithVModel('<input v-model.trim="model" />')

      expect(code).toMatchSnapshot()
    })

    test('.lazy', () => {
      const { code } = compileWithVModel('<input v-model.lazy="model" />')

      expect(code).toMatchSnapshot()
    })
  })

  test('should support member expression', () => {
    const { code } = compileWithVModel(
      '<input v-model="setupRef.child" /><input v-model="setupLet.child" /><input v-model="setupMaybeRef.child" />',
      {
        bindingMetadata: {
          setupRef: BindingTypes.SETUP_REF,
          setupLet: BindingTypes.SETUP_LET,
          setupMaybeRef: BindingTypes.SETUP_MAYBE_REF,
        },
      },
    )

    expect(code).toMatchSnapshot()
  })

  test('should support member expression w/ inline', () => {
    const { code } = compileWithVModel(
      '<input v-model="setupRef.child" /><input v-model="setupLet.child" /><input v-model="setupMaybeRef.child" />',
      {
        bindingMetadata: {
          setupRef: BindingTypes.SETUP_REF,
          setupLet: BindingTypes.SETUP_LET,
          setupMaybeRef: BindingTypes.SETUP_MAYBE_REF,
        },
        inline: true,
      },
    )

    expect(code).toMatchSnapshot()
  })
})
