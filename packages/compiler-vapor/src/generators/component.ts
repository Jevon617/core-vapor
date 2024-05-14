import { camelize, extend, isArray } from '@vue/shared'
import type { CodegenContext } from '../generate'
import {
  type ComponentDynamicSlot,
  type ComponentSlots,
  type CreateComponentIRNode,
  IRDynamicPropsKind,
  type IRProp,
  type IRProps,
  type IRPropsStatic,
} from '../ir'
import {
  type CodeFragment,
  DELIMITERS_ARRAY,
  DELIMITERS_ARRAY_NEWLINE,
  DELIMITERS_OBJECT,
  DELIMITERS_OBJECT_NEWLINE,
  NEWLINE,
  genCall,
  genMulti,
} from './utils'
import { genExpression } from './expression'
import { genPropKey } from './prop'
import { createSimpleExpression, toValidAssetId } from '@vue/compiler-dom'
import { genEventHandler } from './event'
import { genDirectiveModifiers, genDirectivesForElement } from './directive'
import { genModelHandler } from './modelValue'
import { genBlock } from './block'

export function genCreateComponent(
  oper: CreateComponentIRNode,
  context: CodegenContext,
): CodeFragment[] {
  const { vaporHelper } = context

  const tag = genTag()
  const { root, slots, dynamicSlots, once } = oper
  const rawProps = genRawProps(oper.props, context)

  return [
    NEWLINE,
    `const n${oper.id} = `,
    ...genCall(
      vaporHelper('createComponent'),
      tag,
      rawProps,
      slots && genSlots(slots, context),
      dynamicSlots && genDynamicSlots(dynamicSlots, context),
      once ? (root ? 'true' : 'false') : root && 'true',
      once && 'true',
    ),
    ...genDirectivesForElement(oper.id, context),
  ]

  function genTag() {
    if (oper.asset) {
      return toValidAssetId(oper.tag, 'component')
    } else {
      return genExpression(
        extend(createSimpleExpression(oper.tag, false), { ast: null }),
        context,
      )
    }
  }
}

export function genRawProps(props: IRProps[], context: CodegenContext) {
  const { vaporHelper } = context
  const frag = props
    .map(props => {
      if (isArray(props)) {
        if (!props.length) return
        return genStaticProps(props, context)
      } else {
        let expr: CodeFragment[]
        if (props.kind === IRDynamicPropsKind.ATTRIBUTE)
          expr = genMulti(DELIMITERS_OBJECT, genProp(props, context))
        else {
          expr = genExpression(props.value, context)
          if (props.handler) expr = genCall(vaporHelper('toHandlers'), expr)
        }
        return ['() => (', ...expr, ')']
      }
    })
    .filter(
      Boolean as any as (v: CodeFragment[] | undefined) => v is CodeFragment[],
    )
  if (frag.length) {
    return genMulti(DELIMITERS_ARRAY_NEWLINE, ...frag)
  }
}

function genStaticProps(
  props: IRPropsStatic,
  context: CodegenContext,
): CodeFragment[] {
  return genMulti(
    props.length > 1 ? DELIMITERS_OBJECT_NEWLINE : DELIMITERS_OBJECT,
    ...props.map(prop => genProp(prop, context, true)),
  )
}

function genProp(prop: IRProp, context: CodegenContext, isStatic?: boolean) {
  return [
    ...genPropKey(prop, context),
    ': ',
    ...(prop.handler
      ? genEventHandler(context, prop.values[0])
      : isStatic
        ? ['() => (', ...genExpression(prop.values[0], context), ')']
        : genExpression(prop.values[0], context)),
    ...(prop.model
      ? [...genModelEvent(prop, context), ...genModelModifiers(prop, context)]
      : []),
  ]
}

function genModelEvent(prop: IRProp, context: CodegenContext): CodeFragment[] {
  const name = prop.key.isStatic
    ? [JSON.stringify(`onUpdate:${camelize(prop.key.content)}`)]
    : ['["onUpdate:" + ', ...genExpression(prop.key, context), ']']
  const handler = genModelHandler(prop.values[0], context)

  return [',', NEWLINE, ...name, ': ', ...handler]
}

function genModelModifiers(
  prop: IRProp,
  context: CodegenContext,
): CodeFragment[] {
  const { key, modelModifiers } = prop
  if (!modelModifiers || !modelModifiers.length) return []

  const modifiersKey = key.isStatic
    ? key.content === 'modelValue'
      ? [`modelModifiers`]
      : [`${key.content}Modifiers`]
    : ['[', ...genExpression(key, context), ' + "Modifiers"]']

  const modifiersVal = genDirectiveModifiers(modelModifiers)
  return [',', NEWLINE, ...modifiersKey, `: () => ({ ${modifiersVal} })`]
}

function genSlots(slots: ComponentSlots, context: CodegenContext) {
  const slotList = Object.entries(slots)
  return genMulti(
    slotList.length > 1 ? DELIMITERS_OBJECT_NEWLINE : DELIMITERS_OBJECT,
    ...slotList.map(([name, slot]) => [name, ': ', ...genBlock(slot, context)]),
  )
}

function genDynamicSlots(
  dynamicSlots: ComponentDynamicSlot[],
  context: CodegenContext,
) {
  const slotsExpr = genMulti(
    dynamicSlots.length > 1 ? DELIMITERS_ARRAY_NEWLINE : DELIMITERS_ARRAY,
    ...dynamicSlots.map(({ name, fn }) =>
      genMulti(
        DELIMITERS_OBJECT_NEWLINE,
        ['name: ', ...genExpression(name, context)],
        ['fn: ', ...genBlock(fn, context)],
      ),
    ),
  )
  return ['() => ', ...slotsExpr]
}
