import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonCard from '../../components/SkeletonCard.vue'

describe('SkeletonCard', () => {
  it('renders with default height', () => {
    const wrapper = mount(SkeletonCard)
    expect(wrapper.find('.skeleton-card').exists()).toBe(true)
    expect(wrapper.attributes('style')).toContain('height: 200px')
  })

  it('renders with custom height', () => {
    const wrapper = mount(SkeletonCard, {
      props: { height: '300px' },
    })
    expect(wrapper.attributes('style')).toContain('height: 300px')
  })

  it('contains skeleton elements', () => {
    const wrapper = mount(SkeletonCard)
    expect(wrapper.find('.skeleton-circle').exists()).toBe(true)
    expect(wrapper.find('.skeleton-line').exists()).toBe(true)
    expect(wrapper.find('.skeleton-box').exists()).toBe(true)
  })

  it('has correct structure', () => {
    const wrapper = mount(SkeletonCard)
    const skeletonContent = wrapper.find('.skeleton-content')
    expect(skeletonContent.exists()).toBe(true)

    const header = wrapper.find('.skeleton-header')
    expect(header.exists()).toBe(true)

    const stats = wrapper.find('.skeleton-stats')
    expect(stats.exists()).toBe(true)
  })
})
